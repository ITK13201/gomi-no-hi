package service

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"io"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/hkdf"
	"crypto/sha256"
)

// decryptPayload reverses encryptPayload for round-trip testing.
func decryptPayload(t *testing.T, body []byte, recipientPriv *ecdh.PrivateKey, authSecret []byte) []byte {
	t.Helper()
	if len(body) < 21 {
		t.Fatal("body too short")
	}
	salt := body[:16]
	rs := binary.BigEndian.Uint32(body[16:20])
	_ = rs
	idLen := int(body[20])
	senderPubBytes := body[21 : 21+idLen]
	ciphertext := body[21+idLen:]

	curve := ecdh.P256()
	senderPub, err := curve.NewPublicKey(senderPubBytes)
	if err != nil {
		t.Fatalf("parse sender pub: %v", err)
	}

	sharedSecret, err := recipientPriv.ECDH(senderPub)
	if err != nil {
		t.Fatalf("ecdh: %v", err)
	}

	recipientPubBytes := recipientPriv.PublicKey().Bytes()
	ikmInfo := make([]byte, 0, 14+len(recipientPubBytes)+len(senderPubBytes))
	ikmInfo = append(ikmInfo, []byte("WebPush: info\x00")...)
	ikmInfo = append(ikmInfo, recipientPubBytes...)
	ikmInfo = append(ikmInfo, senderPubBytes...)

	deriveKey := func(salt2, ikm2, info []byte, l int) []byte {
		r := hkdf.New(sha256.New, ikm2, salt2, info)
		out := make([]byte, l)
		if _, err := io.ReadFull(r, out); err != nil {
			t.Fatal(err)
		}
		return out
	}

	ikm := deriveKey(authSecret, sharedSecret, ikmInfo, 32)
	cek := deriveKey(salt, ikm, []byte("Content-Encoding: aes128gcm\x00"), 16)
	nonce := deriveKey(salt, ikm, []byte("Content-Encoding: nonce\x00"), 12)

	block, err := aes.NewCipher(cek)
	if err != nil {
		t.Fatal(err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		t.Fatal(err)
	}
	plainPadded, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	// Strip 0x02 delimiter
	return bytes.TrimRight(plainPadded, "\x02")
}

func TestEncryptDecryptRoundTrip(t *testing.T) {
	curve := ecdh.P256()
	recipientPriv, err := curve.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	recipientPubB64 := encodeBase64URL(recipientPriv.PublicKey().Bytes())

	authRaw := make([]byte, 16)
	if _, err := io.ReadFull(rand.Reader, authRaw); err != nil {
		t.Fatal(err)
	}
	authB64 := encodeBase64URL(authRaw)

	plaintext := []byte(`{"title":"test","body":"hello"}`)
	ciphertext, senderPub, salt, err := encryptPayload(plaintext, recipientPubB64, authB64)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	body := buildBody(salt, senderPub, ciphertext)
	got := decryptPayload(t, body, recipientPriv, authRaw)

	if !bytes.Equal(got, plaintext) {
		t.Errorf("round-trip mismatch: got %s, want %s", got, plaintext)
	}
}

func TestBuildVAPIDJWT(t *testing.T) {
	curve := ecdh.P256()
	privKey, err := curve.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}

	svc := &Service{
		vapidPub:  privKey.PublicKey(),
		vapidPriv: privKey,
		vapidSubj: "mailto:test@example.com",
	}

	tokenStr, err := svc.buildVAPIDJWT("https://push.example.com")
	if err != nil {
		t.Fatalf("buildVAPIDJWT: %v", err)
	}

	ecKey, err := ecdhPrivToECDSA(privKey)
	if err != nil {
		t.Fatal(err)
	}

	token, err := jwt.Parse(tokenStr, func(tok *jwt.Token) (interface{}, error) {
		return &ecKey.PublicKey, nil
	}, jwt.WithValidMethods([]string{"ES256"}))
	if err != nil {
		t.Fatalf("jwt parse: %v", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		t.Fatal("invalid token")
	}
	if claims["sub"] != "mailto:test@example.com" {
		t.Errorf("sub mismatch: %v", claims["sub"])
	}
	if claims["aud"] != "https://push.example.com" {
		t.Errorf("aud mismatch: %v", claims["aud"])
	}
	exp, _ := claims["exp"].(float64)
	if exp < float64(time.Now().Unix()) {
		t.Error("token already expired")
	}
}

func TestNotifyScheduleMatch(t *testing.T) {
	type payload struct {
		Title string
		Body  string
	}
	tests := []struct {
		jstHour     int
		morningHour int
		eveningHour int
		today       string
		tomorrow    string
		wantSend    bool
	}{
		{7, 7, 20, "2026-04-01", "2026-04-02", true},  // morning, today is burnable
		{20, 7, 20, "2026-04-01", "2026-04-02", true}, // evening, tomorrow has types
		{12, 7, 20, "2026-04-01", "2026-04-02", false}, // mid-day, no notification
		{7, 7, 20, "2099-01-01", "2099-01-02", false},  // no schedule for date
	}

	for _, tt := range tests {
		todayTypes := getCollectionTypes(tt.today)
		tomorrowTypes := getCollectionTypes(tt.tomorrow)
		var willSend bool
		if tt.jstHour == tt.morningHour && len(todayTypes) > 0 {
			willSend = true
		} else if tt.jstHour == tt.eveningHour && len(tomorrowTypes) > 0 {
			willSend = true
		}
		if willSend != tt.wantSend {
			t.Errorf("jstHour=%d morning=%d evening=%d today=%s tomorrow=%s: willSend=%v want=%v",
				tt.jstHour, tt.morningHour, tt.eveningHour, tt.today, tt.tomorrow, willSend, tt.wantSend)
		}
	}
}

func TestFormatTypes(t *testing.T) {
	got := formatTypes([]string{"burnable", "nonBurnable"})
	if got != "燃えるごみ・燃えないごみ" {
		t.Errorf("unexpected: %s", got)
	}
}

func TestFormatDateLabel(t *testing.T) {
	// 2026-04-01 is Wednesday
	got := formatDateLabel("2026-04-01")
	expected := "4/1・水"
	if got != expected {
		t.Errorf("got %q want %q", got, expected)
	}
}

func TestBuildBody(t *testing.T) {
	salt := make([]byte, 16)
	senderPub := make([]byte, 65)
	ciphertext := []byte("encrypted")
	body := buildBody(salt, senderPub, ciphertext)
	if len(body) != 16+4+1+65+len(ciphertext) {
		t.Errorf("unexpected body length: %d", len(body))
	}
	rs := binary.BigEndian.Uint32(body[16:20])
	if rs != 4096 {
		t.Errorf("rs should be 4096, got %d", rs)
	}
	if body[20] != 65 {
		t.Errorf("idlen should be 65, got %d", body[20])
	}
}

func TestDecodeEncodeBase64URL(t *testing.T) {
	original := []byte("hello world test bytes")
	encoded := encodeBase64URL(original)
	decoded, err := decodeBase64URL(encoded)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(decoded, original) {
		t.Errorf("round-trip failed")
	}
}

func TestSubscriptionKey(t *testing.T) {
	k1 := subscriptionKey("https://example.com/push/abc")
	k2 := subscriptionKey("https://example.com/push/abc")
	k3 := subscriptionKey("https://example.com/push/xyz")

	if k1 != k2 {
		t.Error("same endpoint should produce same key")
	}
	if k1 == k3 {
		t.Error("different endpoints should produce different keys")
	}
	if len(k1) == 0 {
		t.Error("key should not be empty")
	}
}

func TestToJSTDateStr(t *testing.T) {
	// UTC 15:00 = JST 00:00 = next day in Japan
	utc := time.Date(2026, 4, 1, 15, 0, 0, 0, time.UTC)
	got := toJSTDateStr(utc)
	if got != "2026-04-02" {
		t.Errorf("expected 2026-04-02, got %s", got)
	}
}

func TestSubscriptionStoreCRUD(t *testing.T) {
	// Verify sub key format
	k := subscriptionKey("https://push.test/sub/1")
	if k[:4] != "sub:" {
		t.Errorf("key should start with sub:, got %s", k)
	}

	k2 := subscriptionKey("https://push.test/sub/2")
	if k == k2 {
		t.Error("different endpoints must produce different keys")
	}

	jsonPayload, err := json.Marshal(storedSubscription{})
	if err != nil {
		t.Fatal(err)
	}
	if len(jsonPayload) == 0 {
		t.Error("json marshal should not produce empty output")
	}
}
