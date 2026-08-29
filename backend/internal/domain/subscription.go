package domain

type Keys struct {
	P256dh string `json:"p256dh"`
	Auth   string `json:"auth"`
}

type Subscription struct {
	Endpoint    string `json:"endpoint"`
	Keys        Keys   `json:"keys"`
	MorningHour int    `json:"morningHour"`
	EveningHour int    `json:"eveningHour"`
}
