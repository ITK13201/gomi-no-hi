package middleware

import (
	"bytes"
	"io"
	"log/slog"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const logBodyMaxBytes = 4 * 1024 // 4KB

type bodyWriter struct {
	gin.ResponseWriter
	body      *bytes.Buffer
	truncated bool
}

func (w *bodyWriter) Write(b []byte) (int, error) {
	remaining := logBodyMaxBytes - w.body.Len()
	if remaining > 0 {
		if len(b) > remaining {
			w.body.Write(b[:remaining])
			w.truncated = true
		} else {
			w.body.Write(b)
		}
	} else {
		w.truncated = true
	}
	return w.ResponseWriter.Write(b)
}

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		var requestBody string
		ct := c.ContentType()
		if strings.HasPrefix(ct, "application/json") {
			bodyBytes, _ := io.ReadAll(io.LimitReader(c.Request.Body, logBodyMaxBytes+1))
			c.Request.Body = io.NopCloser(io.MultiReader(bytes.NewBuffer(bodyBytes), c.Request.Body))
			if len(bodyBytes) > logBodyMaxBytes {
				requestBody = string(bodyBytes[:logBodyMaxBytes]) + "...(truncated)"
			} else {
				requestBody = string(bodyBytes)
			}
		}

		slog.InfoContext(c.Request.Context(), "http.request",
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.Group("extra",
				"query", c.Request.URL.RawQuery,
				"content_type", ct,
				"body", requestBody,
			),
		)

		bw := &bodyWriter{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = bw

		c.Next()

		responseBody := bw.body.String()
		if bw.truncated {
			responseBody += "...(truncated)"
		}

		slog.InfoContext(c.Request.Context(), "http.response",
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.Group("extra",
				"status", c.Writer.Status(),
				"latency_ms", time.Since(start).Milliseconds(),
				"body", responseBody,
			),
		)
	}
}
