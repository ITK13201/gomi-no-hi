package service

import (
	_ "embed"
	"encoding/json"
	"sync"
)

//go:embed data/schedule.json
var scheduleJSON []byte

type collectionDay struct {
	Date  string   `json:"date"`
	Types []string `json:"types"`
}

var (
	scheduleOnce sync.Once
	scheduleMap  map[string][]string
)

func loadSchedule() map[string][]string {
	scheduleOnce.Do(func() {
		var days []collectionDay
		if err := json.Unmarshal(scheduleJSON, &days); err != nil {
			panic("failed to parse schedule.json: " + err.Error())
		}
		m := make(map[string][]string, len(days))
		for _, d := range days {
			m[d.Date] = d.Types
		}
		scheduleMap = m
	})
	return scheduleMap
}

func getCollectionTypes(dateStr string) []string {
	m := loadSchedule()
	if types, ok := m[dateStr]; ok {
		return types
	}
	return nil
}
