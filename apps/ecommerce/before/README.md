# hello-otel

Mock e-commerce API — part of the [Pulsar dogfood suite](https://github.com/jasonmimick/pulsar/blob/main/docs/dogfood-suite.md).

This app exists to be instrumented. Pulsar scans it, detects observability gaps, and generates PRs to add traces, logs, and metrics. The quality of Pulsar's output feeds back into improving Pulsar itself.

## Routes

| Route | Methods | Business events |
|---|---|---|
| `/api/products` | GET | `products.list` |
| `/api/cart` | GET, PUT | `cart.get`, `cart.updated` |
| `/api/checkout` | POST | `checkout.started`, `fraud.check`, `checkout.declined`, `payment.failed`, `checkout.completed` |
| `/api/orders` | GET, POST | `orders.list`, `order.created` |
| `/api/inventory` | GET | `inventory.report` |

## Baseline

The `dogfood-v0` tag marks the pre-OTel state: structured `console.log` events in every route, no OTel SDK. Reset to it any time:

```bash
git checkout dogfood-v0          # inspect the baseline
git diff dogfood-v0 main         # see everything Pulsar added
git reset --hard dogfood-v0      # reset main (then force-push if needed)
```

## Current state

OTel fully wired (`main` branch):
- `instrumentation.ts` — OTel SDK init via `@vercel/otel`
- `lib/logger.ts` — log emit bridge via `@opentelemetry/api-logs`
- `lib/metrics.ts` — counters + histograms via `@opentelemetry/api`
- All routes use `logger.info()` and metric increments

Required env vars (set in Vercel dashboard, not committed):
```
OTEL_SERVICE_NAME=hello-otel
OTEL_TRACES_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=<pulsar-endpoint>
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <token>   # encrypted secret
```

## Running locally

```bash
npm install
npm run dev   # http://localhost:3000
```
