package lib

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/metric"
)

var metricsMutex = &sync.RWMutex{}
var metricsStore = make(map[string]map[string]*MetricEntry)

// meter uses the global MeterProvider. Instruments created before main() sets
// the SDK provider are lazy delegates, so early traffic-gen increments are
// safe and start exporting once the provider is registered.
var meter = otel.Meter("hello-otel-social")

type MetricEntry struct {
	Count  int64       `json:"count"`
	Sum    float64     `json:"sum,omitempty"`
	Values []MetricValue `json:"values,omitempty"`
}

type MetricValue struct {
	Value     float64 `json:"value"`
	Timestamp string  `json:"timestamp"`
}

type Counter struct {
	name string
	otel metric.Int64Counter
}

type Histogram struct {
	name string
	otel metric.Float64Histogram
}

func newCounter(name, description string) *Counter {
	c := &Counter{name: name}
	if inst, err := meter.Int64Counter(name, metric.WithDescription(description)); err == nil {
		c.otel = inst
	}
	return c
}

func newHistogram(name, description, unit string) *Histogram {
	h := &Histogram{name: name}
	if inst, err := meter.Float64Histogram(name,
		metric.WithDescription(description),
		metric.WithUnit(unit),
	); err == nil {
		h.otel = inst
	}
	return h
}

// Add records to the in-memory store (backing /api/metrics) AND the OTel
// counter instrument of the same name.
func (c *Counter) Add(ctx context.Context, value int64, labels ...map[string]string) {
	recordCounter(c.name, labels...)
	if c.otel != nil {
		c.otel.Add(ctx, value)
	}
}

// Record records to the in-memory store AND the OTel histogram instrument.
func (h *Histogram) Record(ctx context.Context, value float64, labels ...map[string]string) {
	recordHistogram(h.name, value, labels...)
	if h.otel != nil {
		h.otel.Record(ctx, value)
	}
}

func recordCounter(metric string, labels ...map[string]string) {
	metricsMutex.Lock()
	defer metricsMutex.Unlock()

	labelKey := "total"
	if len(labels) > 0 && len(labels[0]) > 0 {
		data, _ := json.Marshal(labels[0])
		labelKey = string(data)
	}

	if metricsStore[metric] == nil {
		metricsStore[metric] = make(map[string]*MetricEntry)
	}
	if metricsStore[metric][labelKey] == nil {
		metricsStore[metric][labelKey] = &MetricEntry{Values: []MetricValue{}}
	}

	metricsStore[metric][labelKey].Count++
	metricsStore[metric][labelKey].Values = append(metricsStore[metric][labelKey].Values, MetricValue{
		Value:     1,
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
	})
}

func recordHistogram(metric string, value float64, labels ...map[string]string) {
	metricsMutex.Lock()
	defer metricsMutex.Unlock()

	labelKey := "total"
	if len(labels) > 0 && len(labels[0]) > 0 {
		data, _ := json.Marshal(labels[0])
		labelKey = string(data)
	}

	if metricsStore[metric] == nil {
		metricsStore[metric] = make(map[string]*MetricEntry)
	}
	if metricsStore[metric][labelKey] == nil {
		metricsStore[metric][labelKey] = &MetricEntry{Values: []MetricValue{}}
	}

	metricsStore[metric][labelKey].Count++
	metricsStore[metric][labelKey].Sum += value
	metricsStore[metric][labelKey].Values = append(metricsStore[metric][labelKey].Values, MetricValue{
		Value:     value,
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
	})
}

// Create metric instances. Names intentionally match the /api/metrics JSON
// keys so the verifier can line the OTel instruments up with the JSON output.
var (
	UsersList        = newCounter("users.list", "Number of user list operations")
	UserCreated      = newCounter("user.created", "Number of users created")
	PostsList        = newCounter("posts.list", "Number of post list operations")
	PostCreated      = newCounter("post.created", "Number of posts created")
	FeedFetched      = newCounter("feed.fetched", "Number of feed fetches")
	NotificationSent = newCounter("notification.sent", "Number of notifications sent")
	RequestLatency   = newHistogram("http.route.latency_ms", "Per-route request latency", "ms")
)

func GetMetricsFormatted() map[string]map[string]interface{} {
	metricsMutex.RLock()
	defer metricsMutex.RUnlock()

	result := make(map[string]map[string]interface{})

	for metric, labeledValues := range metricsStore {
		result[metric] = make(map[string]interface{})
		for labelKey, entry := range labeledValues {
			var labelStr string
			if labelKey == "total" {
				labelStr = "total"
			} else {
				var labels map[string]string
				json.Unmarshal([]byte(labelKey), &labels)
				if len(labels) > 0 {
					data, _ := json.Marshal(labels)
					labelStr = string(data)
				} else {
					labelStr = "total"
				}
			}

			if entry.Sum > 0 {
				// Histogram
				result[metric][labelStr] = map[string]interface{}{
					"count": entry.Count,
					"sum":   entry.Sum,
					"avg":   float64(entry.Sum) / float64(entry.Count),
				}
			} else {
				// Counter
				result[metric][labelStr] = entry.Count
			}
		}
	}

	return result
}
