package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/itk13201/gomi-no-hi/backend/internal/handler"
	"github.com/itk13201/gomi-no-hi/backend/internal/logger"
	"github.com/itk13201/gomi-no-hi/backend/internal/service"
)

func main() {
	slog.SetDefault(slog.New(logger.NewHandler(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))))

	if len(os.Args) > 1 && os.Args[1] == "notify" {
		runNotify()
		return
	}
	runServer()
}

func runServer() {
	svc, err := service.New()
	if err != nil {
		slog.Error("failed to initialize service", "error", err)
		os.Exit(1)
	}
	defer svc.Close()

	r := gin.New()
	handler.Register(r, svc)

	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	go func() {
		slog.Info("starting server", "port", 8080)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("server shutdown error", "error", err)
	}
}

func runNotify() {
	svc, err := service.New()
	if err != nil {
		slog.Error("failed to initialize service", "error", err)
		os.Exit(1)
	}
	defer svc.Close()

	batchID := uuid.NewString()
	ctx := logger.WithBatchID(context.Background(), batchID)
	start := time.Now()

	slog.InfoContext(ctx, "batch.notify started")

	if err := svc.RunNotify(ctx); err != nil {
		slog.ErrorContext(ctx, "batch.notify failed",
			slog.Group("extra", "error", err, "elapsed_ms", time.Since(start).Milliseconds()),
		)
		os.Exit(1)
	}

	slog.InfoContext(ctx, "batch.notify finished",
		slog.Group("extra", "elapsed_ms", time.Since(start).Milliseconds()),
	)
}
