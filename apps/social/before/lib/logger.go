package lib

import (
	"encoding/json"
	"fmt"
	"time"
)

type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Event     string                 `json:"event"`
	TraceID   string                 `json:"traceId"`
	SpanID    string                 `json:"spanId"`
	Fields    map[string]interface{} `json:"fields"`
}

var globalTraceID = generateUUID()

func generateUUID() string {
	// Simple UUID v4-like generator
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		randInt(), randInt()%65536, randInt()%65536, randInt()%65536, randInt())
}

func randInt() int {
	return int(time.Now().UnixNano() / 1e6 % 1e8)
}

type logger struct{}

func (l *logger) log(level, event string, fields map[string]interface{}) {
	entry := LogEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Level:     level,
		Event:     event,
		TraceID:   globalTraceID,
		SpanID:    generateUUID(),
		Fields:    fields,
	}
	data, _ := json.Marshal(entry)
	fmt.Println(string(data))
}

func (l *logger) Info(event string, fields map[string]interface{}) {
	l.log("info", event, fields)
}

func (l *logger) Warn(event string, fields map[string]interface{}) {
	l.log("warn", event, fields)
}

func (l *logger) Error(event string, fields map[string]interface{}) {
	l.log("error", event, fields)
}

func (l *logger) Debug(event string, fields map[string]interface{}) {
	l.log("debug", event, fields)
}

var Logger = &logger{}
