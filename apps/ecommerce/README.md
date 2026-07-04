# ecommerce — Next.js, before & after OpenTelemetry

A small storefront API (products, cart, checkout, orders) in two states:

- **`before/`** — a good, normal Next.js app: structured JSON logs to stdout,
  in-memory JSON counters at `GET /api/metrics`, `GET /api/health`. **Zero OpenTelemetry.**
- **`after/`** — the same app with canonical CNCF instrumentation:
  traces + metrics + logs over OTLP (HTTP), auto-instrumented routes via the
  OTel Node SDK, business metrics and log records. Everything `before/` had
  still works.

**The point is the diff:**

```bash
diff -ru before/ after/
```

Instrumentation lives in `after/instrumentation.ts` (the Next.js
instrumentation hook, runtime-agnostic) plus `after/instrumentation-node.ts`
(the actual OTel NodeSDK setup, dynamically imported so the Edge runtime
build never sees Node-only modules), and the OTel packages added to
`package.json`.

## Run standalone

```bash
# before — no observability stack needed
cd before && npm install && npm run build && npm start
# listens on :3000

# after — point it at any OTLP/HTTP endpoint (collector or grafana/otel-lgtm)
cd after && npm install && npm run build
OTEL_SERVICE_NAME=ecommerce-after OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
  npm start
```

Or with Docker (app pair + LGTM backend, from this directory):

```bash
docker compose up -d --build
# before: http://localhost:8011  after: http://localhost:8012  Grafana: http://localhost:3000
```

## Endpoints (both versions)

| Route | What |
|---|---|
| `GET /api/health` | liveness |
| `GET /api/metrics` | in-memory JSON business counters |
| `GET /api/products?category=` | list products |
| `GET /api/cart?cartId=` | get cart |
| `PUT /api/cart` | upsert cart item (JSON body: `cartId`, `productId`, `quantity`) |
| `POST /api/checkout` | checkout (JSON body: `cartId`, `customerId`) |
| `GET /api/orders?customerId=` | list orders |
| `POST /api/orders` | create order (JSON body: `customerId`, `items`) |

## Signals emitted by after/

- **Traces**: one span per request (Next.js/HTTP auto-instrumentation) + custom spans
- **Metrics**: `checkout_attempts_total`, `orders_created_total`, `cart_updates_total`,
  `checkout_fraud_declines_total`, `payment_failures_total`, `checkout_value_usd` (histogram), …
- **Logs**: every structured business event, correlated to the active trace
