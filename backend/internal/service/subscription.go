package service

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log/slog"
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
	slog.InfoContext(ctx, "SaveSubscription started",
		slog.Group("extra", "endpoint", sub.Endpoint),
	)
	key := subscriptionKey(sub.Endpoint)
	stored := storedSubscription{
		Subscription: sub,
		SubscribedAt: time.Now().UTC().Format(time.RFC3339),
	}
	data, err := json.Marshal(stored)
	if err != nil {
		slog.ErrorContext(ctx, "SaveSubscription failed",
			slog.Group("extra", "error", err),
		)
		return err
	}
	if err := s.redis.Set(ctx, key, data, 0).Err(); err != nil {
		slog.ErrorContext(ctx, "SaveSubscription failed",
			slog.Group("extra", "error", err),
		)
		return err
	}
	slog.InfoContext(ctx, "SaveSubscription finished",
		slog.Group("extra", "endpoint", sub.Endpoint),
	)
	return nil
}

func (s *Service) DeleteSubscription(ctx context.Context, endpoint string) error {
	slog.InfoContext(ctx, "DeleteSubscription started",
		slog.Group("extra", "endpoint", endpoint),
	)
	key := subscriptionKey(endpoint)
	if err := s.redis.Del(ctx, key).Err(); err != nil {
		slog.ErrorContext(ctx, "DeleteSubscription failed",
			slog.Group("extra", "error", err),
		)
		return err
	}
	slog.InfoContext(ctx, "DeleteSubscription finished",
		slog.Group("extra", "endpoint", endpoint),
	)
	return nil
}

func (s *Service) AllSubscriptions(ctx context.Context) ([]storedSubscription, error) {
	slog.InfoContext(ctx, "AllSubscriptions started")
	keys, err := s.redis.Keys(ctx, "sub:*").Result()
	if err != nil {
		slog.ErrorContext(ctx, "AllSubscriptions failed",
			slog.Group("extra", "error", err),
		)
		return nil, err
	}
	subs := make([]storedSubscription, 0, len(keys))
	for _, key := range keys {
		raw, err := s.redis.Get(ctx, key).Result()
		if err != nil {
			slog.WarnContext(ctx, "AllSubscriptions: get key failed",
				slog.Group("extra", "key", key, "error", err),
			)
			continue
		}
		var sub storedSubscription
		if err := json.Unmarshal([]byte(raw), &sub); err != nil {
			slog.WarnContext(ctx, "AllSubscriptions: unmarshal failed",
				slog.Group("extra", "key", key, "error", err),
			)
			continue
		}
		subs = append(subs, sub)
	}
	slog.InfoContext(ctx, "AllSubscriptions finished",
		slog.Group("extra", "count", len(subs)),
	)
	return subs, nil
}
