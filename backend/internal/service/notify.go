package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

var wasteLabels = map[string]string{
	"burnable":     "燃えるごみ",
	"nonBurnable":  "燃えないごみ",
	"paper":        "古紙類",
	"petBottle":    "ペットボトル",
	"bottle":       "びん",
	"can":          "缶",
	"oldClothes":   "古着類",
	"whiteTray":    "白色トレイ",
	"hazardous":    "危険ごみ",
	"communityPaper": "集団回収",
}

var weekdays = [7]string{"日", "月", "火", "水", "木", "金", "土"}

func formatTypes(types []string) string {
	labels := make([]string, 0, len(types))
	for _, t := range types {
		if l, ok := wasteLabels[t]; ok {
			labels = append(labels, l)
		} else {
			labels = append(labels, t)
		}
	}
	result := ""
	for i, l := range labels {
		if i > 0 {
			result += "・"
		}
		result += l
	}
	return result
}

func formatDateLabel(dateStr string) string {
	t, err := time.ParseInLocation("2006-01-02", dateStr, jstLocation())
	if err != nil {
		return dateStr
	}
	return fmt.Sprintf("%d/%d・%s", t.Month(), t.Day(), weekdays[t.Weekday()])
}

func toJSTDateStr(t time.Time) string {
	jst := t.In(jstLocation())
	return jst.Format("2006-01-02")
}

func jstLocation() *time.Location {
	return time.FixedZone("JST", 9*60*60)
}

func runBatchNotify(ctx context.Context, s *Service) error {
	now := time.Now().UTC()
	jstHour := (now.UTC().Hour() + 9) % 24

	todayStr := toJSTDateStr(now)
	tomorrowStr := toJSTDateStr(now.Add(24 * time.Hour))

	subs, err := s.AllSubscriptions(ctx)
	if err != nil {
		return fmt.Errorf("fetch subscriptions: %w", err)
	}

	for _, sub := range subs {
		var notification *struct{ title, body string }

		if jstHour == sub.MorningHour {
			types := getCollectionTypes(todayStr)
			if len(types) > 0 {
				notification = &struct{ title, body string }{
					title: "ごみの日のお知らせ",
					body:  fmt.Sprintf("今日（%s）は%sの日です", formatDateLabel(todayStr), formatTypes(types)),
				}
			}
		} else if jstHour == sub.EveningHour {
			types := getCollectionTypes(tomorrowStr)
			if len(types) > 0 {
				notification = &struct{ title, body string }{
					title: "ごみの日のお知らせ",
					body:  fmt.Sprintf("明日（%s）は%sの日です", formatDateLabel(tomorrowStr), formatTypes(types)),
				}
			}
		}

		if notification == nil {
			continue
		}

		err := s.SendWebPush(ctx, sub.Subscription, notification.title, notification.body)
		if err != nil {
			if gone, ok := err.(*ErrSubscriptionGone); ok {
				if delErr := s.DeleteSubscription(ctx, gone.Endpoint); delErr != nil {
					slog.Error("failed to delete stale subscription", "endpoint", gone.Endpoint, "error", delErr)
				} else {
					slog.Info("deleted stale subscription", "endpoint", gone.Endpoint, "reason", "410/404")
				}
			} else {
				slog.Error("push failed", "endpoint", sub.Endpoint, "error", err)
			}
		} else {
			slog.Info("push sent", "endpoint", sub.Endpoint)
		}
	}
	return nil
}
