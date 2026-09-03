package logger

import (
	"context"
	"log/slog"
)

type requestIDKey struct{}
type batchIDKey struct{}

func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey{}, id)
}

func WithBatchID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, batchIDKey{}, id)
}

// Handler is a slog.Handler that prepends request_id / batch_id from context to every log record.
type Handler struct {
	inner slog.Handler
}

func NewHandler(inner slog.Handler) *Handler {
	return &Handler{inner: inner}
}

func (h *Handler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.inner.Enabled(ctx, level)
}

func (h *Handler) Handle(ctx context.Context, r slog.Record) error {
	requestID, _ := ctx.Value(requestIDKey{}).(string)
	batchID, _ := ctx.Value(batchIDKey{}).(string)

	if requestID == "" && batchID == "" {
		return h.inner.Handle(ctx, r)
	}

	nr := slog.NewRecord(r.Time, r.Level, r.Message, r.PC)
	if requestID != "" {
		nr.AddAttrs(slog.String("request_id", requestID))
	}
	if batchID != "" {
		nr.AddAttrs(slog.String("batch_id", batchID))
	}
	r.Attrs(func(a slog.Attr) bool {
		nr.AddAttrs(a)
		return true
	})
	return h.inner.Handle(ctx, nr)
}

func (h *Handler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &Handler{inner: h.inner.WithAttrs(attrs)}
}

func (h *Handler) WithGroup(name string) slog.Handler {
	return &Handler{inner: h.inner.WithGroup(name)}
}
