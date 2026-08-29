package service

import (
	"testing"
)

func TestGetCollectionTypes(t *testing.T) {
	tests := []struct {
		date     string
		expected []string
	}{
		{"2026-04-01", []string{"burnable"}},
		{"2026-04-02", []string{"bottle", "oldClothes", "whiteTray", "hazardous"}},
		{"2026-04-06", []string{"nonBurnable", "paper"}},
		{"2026-04-26", []string{"communityPaper"}},
		{"2099-01-01", nil},
	}

	for _, tt := range tests {
		got := getCollectionTypes(tt.date)
		if len(got) != len(tt.expected) {
			t.Errorf("date=%s: got %v, want %v", tt.date, got, tt.expected)
			continue
		}
		for i, v := range got {
			if v != tt.expected[i] {
				t.Errorf("date=%s idx=%d: got %v, want %v", tt.date, i, v, tt.expected[i])
			}
		}
	}
}
