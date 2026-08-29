package service

import (
	"context"
	"crypto/ecdh"
	"encoding/base64"
	"fmt"
	"os"

	"github.com/redis/go-redis/v9"
)

type Service struct {
	redis      *redis.Client
	vapidPub   *ecdh.PublicKey
	vapidPriv  *ecdh.PrivateKey
	vapidSubj  string
}

func New() (*Service, error) {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	redisPass := os.Getenv("REDIS_PASSWORD")

	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPass,
	})

	vapidPubB64 := os.Getenv("VAPID_PUBLIC_KEY")
	vapidPrivB64 := os.Getenv("VAPID_PRIVATE_KEY")
	vapidSubj := os.Getenv("VAPID_SUBJECT")
	if vapidSubj == "" {
		vapidSubj = "mailto:admin@example.com"
	}

	var vapidPub *ecdh.PublicKey
	var vapidPriv *ecdh.PrivateKey

	if vapidPubB64 != "" && vapidPrivB64 != "" {
		pubBytes, err := base64.RawURLEncoding.DecodeString(vapidPubB64)
		if err != nil {
			return nil, fmt.Errorf("invalid VAPID_PUBLIC_KEY: %w", err)
		}
		privBytes, err := base64.RawURLEncoding.DecodeString(vapidPrivB64)
		if err != nil {
			return nil, fmt.Errorf("invalid VAPID_PRIVATE_KEY: %w", err)
		}
		curve := ecdh.P256()
		vapidPub, err = curve.NewPublicKey(pubBytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse VAPID public key: %w", err)
		}
		vapidPriv, err = curve.NewPrivateKey(privBytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse VAPID private key: %w", err)
		}
	}

	return &Service{
		redis:     rdb,
		vapidPub:  vapidPub,
		vapidPriv: vapidPriv,
		vapidSubj: vapidSubj,
	}, nil
}

func (s *Service) Close() {
	s.redis.Close()
}

func (s *Service) RunNotify(ctx context.Context) error {
	return runBatchNotify(ctx, s)
}

// NewWithRedis creates a Service with a pre-configured Redis client (for testing).
func NewWithRedis(rdb *redis.Client) *Service {
	return &Service{redis: rdb}
}
