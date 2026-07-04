// Business metrics: every record goes to BOTH
//   1. the OTel Meter (exported over OTLP -> Prometheus), and
//   2. the in-memory store served as JSON at /api/metrics.
// Instrument names are snake_case and identical to the /api/metrics JSON keys.

import { metrics, type Counter, type Histogram } from "@opentelemetry/api";
import { recordCounter, recordHistogram } from "./metrics-store";

const METER_NAME = "hello-otel-ecommerce";
const METER_VERSION = "1.0.0";

export const COUNTER_NAMES = [
  "checkout_attempts_total",
  "checkout_fraud_declines_total",
  "payment_failures_total",
  "cart_updates_total",
  "orders_created_total",
] as const;

export const HISTOGRAM_NAMES = ["checkout_value_usd"] as const;

// Instruments are created lazily: the global MeterProvider is only registered
// once NodeSDK starts in instrumentation.ts. Creating instruments at module
// import time would bind them to the no-op meter forever.
const counterCache = new Map<string, Counter>();
const histogramCache = new Map<string, Histogram>();

function otelCounter(name: string, description: string): Counter {
  let c = counterCache.get(name);
  if (!c) {
    c = metrics.getMeter(METER_NAME, METER_VERSION).createCounter(name, { description });
    counterCache.set(name, c);
  }
  return c;
}

function otelHistogram(name: string, description: string, unit: string): Histogram {
  let h = histogramCache.get(name);
  if (!h) {
    h = metrics
      .getMeter(METER_NAME, METER_VERSION)
      .createHistogram(name, { description, unit });
    histogramCache.set(name, h);
  }
  return h;
}

type Attrs = Record<string, string>;

function counter(name: string, description: string) {
  return {
    add(value: number, attributes?: Attrs) {
      otelCounter(name, description).add(value, attributes);
      recordCounter(name, attributes, value);
    },
  };
}

function histogram(name: string, description: string, unit: string) {
  return {
    record(value: number, attributes?: Attrs) {
      otelHistogram(name, description, unit).record(value, attributes);
      recordHistogram(name, value, attributes);
    },
  };
}

export const checkoutAttempts = counter(
  "checkout_attempts_total",
  "Total checkout attempts"
);

export const checkoutValue = histogram(
  "checkout_value_usd",
  "Checkout order value in USD",
  "USD"
);

export const fraudDeclines = counter(
  "checkout_fraud_declines_total",
  "Checkouts declined by fraud detection"
);

export const paymentFailures = counter(
  "payment_failures_total",
  "Payment gateway failures during checkout"
);

export const cartUpdates = counter("cart_updates_total", "Total cart updates");

export const ordersCreated = counter("orders_created_total", "Total orders created");
