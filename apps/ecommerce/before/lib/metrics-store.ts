// Pre-OTel: In-memory metrics store
// Tracks counters and histograms without exporting
// Will be replaced by OTel metrics exporter once instrumented

type MetricValue = { value: number; timestamp: string };
type MetricEntry = { count: number; sum?: number; values: MetricValue[] };

const store: Record<string, Record<string, MetricEntry>> = {};

export function recordCounter(
  metric: string,
  labels: Record<string, string> = {}
) {
  const labelKey = JSON.stringify(labels);
  if (!store[metric]) store[metric] = {};
  if (!store[metric][labelKey]) {
    store[metric][labelKey] = { count: 0, values: [] };
  }
  store[metric][labelKey].count += 1;
  store[metric][labelKey].values.push({
    value: 1,
    timestamp: new Date().toISOString(),
  });
}

export function recordHistogram(
  metric: string,
  value: number,
  labels: Record<string, string> = {}
) {
  const labelKey = JSON.stringify(labels);
  if (!store[metric]) store[metric] = {};
  if (!store[metric][labelKey]) {
    store[metric][labelKey] = { count: 0, sum: 0, values: [] };
  }
  store[metric][labelKey].count += 1;
  store[metric][labelKey].sum = (store[metric][labelKey].sum || 0) + value;
  store[metric][labelKey].values.push({
    value,
    timestamp: new Date().toISOString(),
  });
}

export function getMetrics(): Record<string, Record<string, MetricEntry>> {
  return store;
}

export function getMetricsFormatted() {
  const result: Record<string, Record<string, any>> = {};

  for (const [metric, labeledValues] of Object.entries(store)) {
    result[metric] = {};
    for (const [labelKey, entry] of Object.entries(labeledValues)) {
      const labels = JSON.parse(labelKey);
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');

      if (entry.sum !== undefined) {
        // Histogram
        result[metric][labelStr || 'total'] = {
          count: entry.count,
          sum: entry.sum,
          avg: entry.count > 0 ? (entry.sum / entry.count).toFixed(2) : 0,
        };
      } else {
        // Counter
        result[metric][labelStr || 'total'] = entry.count;
      }
    }
  }

  return result;
}

export function reset() {
  Object.keys(store).forEach((k) => delete store[k]);
}
