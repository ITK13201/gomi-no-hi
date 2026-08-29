package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/itk13201/gomi-no-hi/backend/internal/service"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newTestService(t *testing.T) *service.Service {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	return service.NewWithRedis(rdb)
}

func newTestRouter(t *testing.T) *gin.Engine {
	svc := newTestService(t)
	r := gin.New()
	Register(r, svc)
	return r
}

func TestSubscribe_Valid(t *testing.T) {
	r := newTestRouter(t)

	body := map[string]interface{}{
		"endpoint":    "https://push.example.com/sub/abc",
		"keys":        map[string]string{"p256dh": "AAAA", "auth": "BBBB"},
		"morningHour": 7,
		"eveningHour": 20,
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/subscribe", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSubscribe_MissingEndpoint(t *testing.T) {
	r := newTestRouter(t)

	body := map[string]interface{}{
		"keys":        map[string]string{"p256dh": "AAAA", "auth": "BBBB"},
		"morningHour": 7,
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/subscribe", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestUnsubscribe_Existing(t *testing.T) {
	r := newTestRouter(t)

	// First subscribe
	subBody := map[string]interface{}{
		"endpoint":    "https://push.example.com/sub/xyz",
		"keys":        map[string]string{"p256dh": "AAAA", "auth": "BBBB"},
		"morningHour": 7,
		"eveningHour": 20,
	}
	b, _ := json.Marshal(subBody)
	req := httptest.NewRequest(http.MethodPost, "/api/subscribe", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Then unsubscribe
	delBody := map[string]string{"endpoint": "https://push.example.com/sub/xyz"}
	b, _ = json.Marshal(delBody)
	req = httptest.NewRequest(http.MethodDelete, "/api/subscribe", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUnsubscribe_NotRegistered(t *testing.T) {
	r := newTestRouter(t)

	body := map[string]string{"endpoint": "https://push.example.com/sub/nonexistent"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodDelete, "/api/subscribe", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 (idempotent), got %d", w.Code)
	}
}
