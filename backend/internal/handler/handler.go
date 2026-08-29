package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/itk13201/gomi-no-hi/backend/internal/middleware"
	"github.com/itk13201/gomi-no-hi/backend/internal/service"
)

func Register(r *gin.Engine, svc *service.Service) {
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())

	r.GET("/healthz", healthz)
	r.POST("/api/subscribe", subscribe(svc))
	r.DELETE("/api/subscribe", unsubscribe(svc))
}

func healthz(c *gin.Context) {
	c.JSON(200, gin.H{"status": "ok"})
}
