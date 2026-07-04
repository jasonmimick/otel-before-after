# fintech — FastAPI, before & after OpenTelemetry

A small banking API (accounts, transfers, loans, transactions) in two states:

- **`before/`** — a good, normal FastAPI app: structured JSON logs to stdout,
  in-memory JSON counters at `GET /metrics`, `GET /health`. **Zero OpenTelemetry.**
- **`after/`** — the same app with canonical CNCF instrumentation:
  traces + metrics + logs over OTLP (gRPC), auto-instrumented FastAPI routes,
  business metrics and log records. Everything `before/` had still works.

**The point is the diff:**

```bash
diff -ru before/ after/
```

Instrumentation lives in `after/otel_init.py` plus a two-line hookup in
`app.py`, and the OTel packages added to `requirements.txt`.

## Run standalone

```bash
# before — no observability stack needed
cd before && pip install -r requirements.txt && uvicorn app:app --port 8000

# after — point it at any OTLP endpoint (collector or grafana/otel-lgtm)
cd after && pip install -r requirements.txt
OTEL_SERVICE_NAME=fintech-after OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317 \
  uvicorn app:app --port 8000
```

Or with Docker (app pair + LGTM backend, from this directory):

```bash
docker compose up -d --build
# before: http://localhost:8001  after: http://localhost:8002  Grafana: http://localhost:3000
```

## Endpoints (both versions)

| Route | What |
|---|---|
| `GET /health` | liveness |
| `GET /metrics` | in-memory JSON business counters |
| `POST /api/accounts?name=&account_type=` | create account |
| `POST /api/transfers?from_account=&to_account=&amount=` | transfer |
| `POST /api/loans?account_id=&amount=&term_months=` | loan request |
| `GET /api/transactions` | transaction list |

## Signals emitted by after/

- **Traces**: one span per request (FastAPI auto-instrumentation) + custom spans
- **Metrics**: `transfer.initiated`, `transfer.completed`, `loan.requested`, …
- **Logs**: every structured business event, correlated to the active trace
