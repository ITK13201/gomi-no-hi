package service

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"

	"github.com/itk13201/gomi-no-hi/backend/internal/domain"
)

type storedSubscription struct {
	domain.Subscription
	SubscribedAt string `json:"subscribedAt"`
}

func subscriptionKey(endpoint string) string {
	h := sha256.Sum256([]byte(endpoint))
	return fmt.Sprintf("sub:%x", h[:8])
}

func (s *Service) SaveSubscription(ctx context.Context, sub domain.Subscription) error {
	key := subscriptionKey(sub.Endpoint)
	stored := storedSubscription{
		Subscription: sub,
		SubscribedAt: time.Now().UTC().Format(time.RFC3339),
	}
	data, err := json.Marshal(stored)
	if err != nil {
		return err
	}
	return s.redis.Set(ctx, key, data, 0).Err()
}

func (s *Service) DeleteSubscription(ctx context.Context, endpoint string) error {
	key := subscriptionKey(endpoint)
	return s.redis.Del(ctx, key).Err()
}

func (s *Service) AllSubscriptions(ctx context.Context) ([]storedSubscription, error) {
	keys, err := s.redis.Keys(ctx, "sub:*").Result()
	if err != nil {
		return nil, err
	}
	subs := make([]storedSubscription, 0, len(keys))
	for _, key := range keys {
		raw, err := s.redis.Get(ctx, key).Result()
		if err != nil {
			continue
		}
		var sub storedSubscription
		if err := json.Unmarshal([]byte(raw), &sub); err != nil {
			continue
		}
		subs = append(subs, sub)
	}
	return subs, nil
}
