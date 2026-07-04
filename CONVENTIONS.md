# Conventions

Read this before touching any app. It is the contract that keeps the pairs honest.

## The before/after rules

`before/` MUST:
- run standalone with zero OpenTelemetry packages, imports, or env vars
- emit structured JSON business events to stdout:
  `{"timestamp","level","event","traceId","spanId","fields"}`
- expose `GET /health` (200 JSON) and in-memory JSON counters at
  `GET /metrics` or `GET /api/metrics` (whichever is idiomatic for the stack)
- be a *good app* someone could copy as a starting point — incomplete
  observability is the point; bad code is not

`after/` MUST:
- be the same app with the minimal, idiomatic CNCF instrumentation added
  (SDK + OTLP exporters; auto-instrumentation where the ecosystem provides it)
- export **traces, metrics, and logs** over OTLP to the collector
  (`OTEL_EXPORTER_OTLP_ENDPOINT`) — never directly to a backend
- keep every `before/` surface working (stdout JSON logs, `/health`, `/metrics`)
- keep the diff reviewable: instrumentation lives in dedicated files
  (`otel_init.py`, `instrumentation.ts`, `otel.go`) plus minimal call sites

## Ports (host, via root docker-compose)

| Service | Port |
|---|---|
| Grafana (lgtm) | 3000 |
| OTLP gRPC / HTTP (collector) | 4317 / 4318 |
| fintech before / after | 8001 / 8002 |
| ecommerce before / after | 8011 / 8012 |
| social before / after | 8023 / 8022 |
| dashboard | 8080 |

Inside containers every app listens on its natural port (FastAPI 8000,
Next.js 3000, Go 8080); only host mappings differ.

## Naming

- OTel service names: `<app>-after` (e.g. `fintech-after`).
- Compose service names: `<app>-before`, `<app>-after`.
- Metric names follow OTel semconv where one exists; business metrics are
  `<domain>.<thing>` (e.g. `transfer.completed`).

## Signal flow

apps(after) --OTLP--> otel-collector --OTLP--> lgtm (Tempo/Loki/Mimir, Grafana UI)

## Env vars (after/ apps)

- `OTEL_SERVICE_NAME`
- `OTEL_EXPORTER_OTLP_ENDPOINT` (http://otel-collector:4318 for Node,
  otel-collector:4317 gRPC for Python/Go)
- `OTEL_EXPORTER_OTLP_INSECURE=true` where the SDK needs it

## Repo hygiene

- No `.env` files, no lockfile-less installs, no OTel deps in `before/`
  manifests (CI greps for this).
- Each app dir has its own README and standalone `docker-compose.yml`.
- Dockerfiles must build from the app dir as context: `docker build before/`.
