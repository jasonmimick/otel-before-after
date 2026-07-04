package lib

import (
	"sync"
	"time"
)

// Event is a business event kept in an in-memory ring buffer for the
// dashboard event stream (/api/events).
type Event struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Event     string                 `json:"event"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
}

const eventBufferSize = 100

var (
	eventsMu  sync.RWMutex
	eventRing = make([]Event, 0, eventBufferSize)
)

// RecordEvent appends a business event to the ring buffer. Called from the
// same code path as structured logging, so every logged business event shows
// up in the stream.
func RecordEvent(level, event string, fields map[string]interface{}) {
	eventsMu.Lock()
	defer eventsMu.Unlock()

	eventRing = append(eventRing, Event{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Level:     level,
		Event:     event,
		Fields:    fields,
	})
	if len(eventRing) > eventBufferSize {
		eventRing = eventRing[len(eventRing)-eventBufferSize:]
	}
}

// RecentEvents returns up to limit events, newest first.
func RecentEvents(limit int) []Event {
	eventsMu.RLock()
	defer eventsMu.RUnlock()

	if limit <= 0 || limit > len(eventRing) {
		limit = len(eventRing)
	}
	out := make([]Event, 0, limit)
	for i := len(eventRing) - 1; i >= len(eventRing)-limit; i-- {
		out = append(out, eventRing[i])
	}
	return out
}
