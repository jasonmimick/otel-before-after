// In-memory mirror of the OTel business metrics, served as JSON at /api/metrics.
// The authoritative export path is OTLP (see lib/metrics.ts); this store exists
// so the dashboard and simple HTTP consumers can read current totals.

type MetricValue = { value: number; timestamp: string };
type MetricEntry = { count: number; sum?: number; values: MetricValue[] };

const MAX_VALUES = 200;

const store: Record<string, Record<string, MetricEntry>> = {};

export function recordCounter(
  metric: string,
  labels: Record<string, string> = {},
  value = 1
) {
  const labelKey = JSON.stringify(labels);
  if (!store[metric]) store[metric] = {};
  if (!store[metric][labelKey]) {
    store[metric][labelKey] = { count: 0, values: [] };
  }
  const entry = store[metric][labelKey];
  entry.count += value;
  entry.values.push({ value, timestamp: new Date().toISOString() });
  if (entry.values.length > MAX_VALUES) entry.values.shift();
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
  const entry = store[metric][labelKey];
  entry.count += 1;
  entry.sum = (entry.sum || 0) + value;
  entry.values.push({ value, timestamp: new Date().toISOString() });
  if (entry.values.length > MAX_VALUES) entry.values.shift();
}

export function getMetrics(): Record<string, Record<string, MetricEntry>> {
  return store;
}

// Flat snapshot keyed by metric name (summed across label sets):
//   counters   -> number
//   histograms -> { count, sum, avg }
export function getMetricsSnapshot(): Record<
  string,
  number | { count: number; sum: number; avg: number }
> {
  const result: Record<string, number | { count: number; sum: number; avg: number }> =
    {};

  for (const [metric, labeledValues] of Object.entries(store)) {
    let count = 0;
    let sum = 0;
    let isHistogram = false;
    for (const entry of Object.values(labeledValues)) {
      count += entry.count;
      if (entry.sum !== undefined) {
        isHistogram = true;
        sum += entry.sum;
      }
    }
    result[metric] = isHistogram
      ? { count, sum: round2(sum), avg: count > 0 ? round2(sum / count) : 0 }
      : count;
  }

  return result;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function reset() {
  Object.keys(store).forEach((k) => delete store[k]);
}
