// Pre-OTel: in-memory business metrics
// Counters and histograms recorded to the local metrics store only,
// surfaced as JSON at GET /api/metrics. No OTel SDK — baseline state.

import { recordCounter, recordHistogram } from "./metrics-store";

type Attrs = Record<string, string>;

function counter(name: string) {
  return {
    add: (_value: number, attributes?: Attrs) => {
      recordCounter(name, attributes);
    },
  };
}

function histogram(name: string) {
  return {
    record: (value: number, attributes?: Attrs) => {
      recordHistogram(name, value, attributes);
    },
  };
}

export const checkoutAttempts = counter("checkout.attempts");
export const checkoutValue = histogram("checkout.value_usd");
export const fraudDeclines = counter("checkout.fraud_declines");
export const cartUpdates = counter("cart.updates");
export const ordersCreated = counter("orders.created");
export const requestLatency = histogram("http.route.latency_ms");

// Back-compat aggregate interface
export const localMetrics = {
  checkoutAttempts,
  checkoutValue,
  fraudDeclines,
  cartUpdates,
  ordersCreated,
  requestLatency,
};
