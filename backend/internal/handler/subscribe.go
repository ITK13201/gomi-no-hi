package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/itk13201/gomi-no-hi/backend/internal/domain"
	"github.com/itk13201/gomi-no-hi/backend/internal/service"
)

type subscribeRequest struct {
	Endpoint    string      `json:"endpoint" binding:"required"`
	Keys        domain.Keys `json:"keys" binding:"required"`
	MorningHour int         `json:"morningHour"`
	EveningHour int         `json:"eveningHour"`
}

type unsubscribeRequest struct {
	Endpoint string `json:"endpoint" binding:"required"`
}

func subscribe(svc *service.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req subscribeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		sub := domain.Subscription{
			Endpoint:    req.Endpoint,
			Keys:        req.Keys,
			MorningHour: req.MorningHour,
			EveningHour: req.EveningHour,
		}
		if err := svc.SaveSubscription(c.Request.Context(), sub); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save"})
			return
		}
		c.Status(http.StatusOK)
	}
}

func unsubscribe(svc *service.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req unsubscribeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := svc.DeleteSubscription(c.Request.Context(), req.Endpoint); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete"})
			return
		}
		c.Status(http.StatusOK)
	}
}
