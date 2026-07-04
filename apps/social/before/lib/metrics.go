package lib

import (
	"encoding/json"
	"sync"
	"time"
)

var metricsMutex = &sync.RWMutex{}
var metricsStore = make(map[string]map[string]*MetricEntry)

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
}

type Histogram struct {
	name string
}

func (c *Counter) Add(value int64, labels ...map[string]string) {
	recordCounter(c.name, labels...)
}

func (h *Histogram) Record(value float64, labels ...map[string]string) {
	recordHistogram(h.name, value, labels...)
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

// Create metric instances
var (
	UsersList         = &Counter{"users.list"}
	UserCreated       = &Counter{"user.created"}
	PostsList         = &Counter{"posts.list"}
	PostCreated       = &Counter{"post.created"}
	FeedFetched       = &Counter{"feed.fetched"}
	NotificationSent  = &Counter{"notification.sent"}
	RequestLatency    = &Histogram{"http.route.latency_ms"}
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
