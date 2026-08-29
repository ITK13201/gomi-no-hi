package service

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/hkdf"

	"github.com/itk13201/gomi-no-hi/backend/internal/domain"
)

type pushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

// ErrSubscriptionGone is returned when the push service responds with 410 or 404.
type ErrSubscriptionGone struct {
	Endpoint string
}

func (e *ErrSubscriptionGone) Error() string {
	return fmt.Sprintf("subscription gone: %s", e.Endpoint)
}

func (s *Service) SendWebPush(ctx context.Context, sub domain.Subscription, title, body string) error {
	data, err := json.Marshal(pushPayload{Title: title, Body: body})
	if err != nil {
		return err
	}

	ciphertext, senderPub, salt, err := encryptPayload(data, sub.Keys.P256dh, sub.Keys.Auth)
	if err != nil {
		return fmt.Errorf("encrypt: %w", err)
	}

	reqBody := buildBody(salt, senderPub, ciphertext)

	u, err := url.Parse(sub.Endpoint)
	if err != nil {
		return err
	}
	audience := fmt.Sprintf("%s://%s", u.Scheme, u.Host)

	vapidToken, err := s.buildVAPIDJWT(audience)
	if err != nil {
		return fmt.Errorf("vapid jwt: %w", err)
	}

	vapidPubB64 := encodeBase64URL(s.vapidPub.Bytes())
	authHdr := fmt.Sprintf("vapid t=%s,k=%s", vapidToken, vapidPubB64)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sub.Endpoint, bytes.NewReader(reqBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Content-Encoding", "aes128gcm")
	req.Header.Set("Authorization", authHdr)
	req.Header.Set("TTL", "86400")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK, http.StatusCreated, http.StatusAccepted:
		return nil
	case http.StatusGone, http.StatusNotFound:
		return &ErrSubscriptionGone{Endpoint: sub.Endpoint}
	default:
		return fmt.Errorf("push failed: %d", resp.StatusCode)
	}
}

func (s *Service) buildVAPIDJWT(audience string) (string, error) {
	ecKey, err := ecdhPrivToECDSA(s.vapidPriv)
	if err != nil {
		return "", err
	}
	now := time.Now()
	claims := jwt.MapClaims{
		"aud": audience,
		"exp": now.Add(12 * time.Hour).Unix(),
		"sub": s.vapidSubj,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	return token.SignedString(ecKey)
}

// encryptPayload implements RFC 8291 (ECDH-ES) + RFC 8188 (aes128gcm).
func encryptPayload(plaintext []byte, p256dhB64, authB64 string) (ciphertext, senderPub, salt []byte, err error) {
	recipientPubBytes, err := decodeBase64URL(p256dhB64)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("p256dh: %w", err)
	}
	authSecret, err := decodeBase64URL(authB64)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("auth: %w", err)
	}

	curve := ecdh.P256()
	recipientPub, err := curve.NewPublicKey(recipientPubBytes)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("recipient pub: %w", err)
	}

	senderPriv, err := curve.GenerateKey(rand.Reader)
	if err != nil {
		return nil, nil, nil, err
	}
	senderPub = senderPriv.PublicKey().Bytes()

	sharedSecret, err := senderPriv.ECDH(recipientPub)
	if err != nil {
		return nil, nil, nil, err
	}

	// RFC 8291 §3.4 IKM = HKDF(salt=authSecret, ikm=sharedSecret, info="WebPush: info\0" || recipientPub || senderPub, len=32)
	ikmInfo := make([]byte, 0, 14+len(recipientPubBytes)+len(senderPub))
	ikmInfo = append(ikmInfo, []byte("WebPush: info\x00")...)
	ikmInfo = append(ikmInfo, recipientPubBytes...)
	ikmInfo = append(ikmInfo, senderPub...)
	ikm, err := hkdfDeriveKey(authSecret, sharedSecret, ikmInfo, 32)
	if err != nil {
		return nil, nil, nil, err
	}

	salt = make([]byte, 16)
	if _, err = io.ReadFull(rand.Reader, salt); err != nil {
		return nil, nil, nil, err
	}

	cek, err := hkdfDeriveKey(salt, ikm, []byte("Content-Encoding: aes128gcm\x00"), 16)
	if err != nil {
		return nil, nil, nil, err
	}
	nonce, err := hkdfDeriveKey(salt, ikm, []byte("Content-Encoding: nonce\x00"), 12)
	if err != nil {
		return nil, nil, nil, err
	}

	block, err := aes.NewCipher(cek)
	if err != nil {
		return nil, nil, nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, nil, err
	}

	padded := append(plaintext, 0x02) // RFC 8188 delimiter
	ciphertext = gcm.Seal(nil, nonce, padded, nil)
	return ciphertext, senderPub, salt, nil
}

// buildBody constructs the RFC 8188 aes128gcm record header + ciphertext.
func buildBody(salt, senderPub, ciphertext []byte) []byte {
	// salt(16) + rs(uint32 BE, 4096) + idlen(1) + keyid(65)
	hdr := make([]byte, 16+4+1+len(senderPub))
	copy(hdr[:16], salt)
	binary.BigEndian.PutUint32(hdr[16:20], 4096)
	hdr[20] = byte(len(senderPub))
	copy(hdr[21:], senderPub)
	return append(hdr, ciphertext...)
}

func hkdfDeriveKey(salt, ikm, info []byte, length int) ([]byte, error) {
	r := hkdf.New(sha256.New, ikm, salt, info)
	out := make([]byte, length)
	if _, err := io.ReadFull(r, out); err != nil {
		return nil, err
	}
	return out, nil
}

func ecdhPrivToECDSA(priv *ecdh.PrivateKey) (*ecdsa.PrivateKey, error) {
	der, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		return nil, err
	}
	key, err := x509.ParsePKCS8PrivateKey(der)
	if err != nil {
		return nil, err
	}
	ecKey, ok := key.(*ecdsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("not an ecdsa private key")
	}
	return ecKey, nil
}

func encodeBase64URL(b []byte) string {
	return base64.RawURLEncoding.EncodeToString(b)
}

func decodeBase64URL(s string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(s)
}
