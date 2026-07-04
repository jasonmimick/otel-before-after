# otel-before-after

**See exactly what OpenTelemetry changes.** Real apps in multiple languages,
each in two runnable states — `before/` (a good app with zero OTel) and
`after/` (the same app with canonical CNCF instrumentation) — plus a stock
OSS observability backend and a verifier that **proves** the signals arrive.

The [OpenTelemetry Demo](https://github.com/open-telemetry/opentelemetry-demo)
shows you a finished, fully-instrumented system. This repo shows you the
*before*, the exact **diff** that adds observability, and a scorecard that
keeps every pair honest.

```
apps/
  fintech/    Python · FastAPI     before/ + after/   ✅
  ecommerce/  TypeScript · Next.js before/ + after/   (coming)
  social/     Go · stdlib          before/ + after/   (coming)
observability/
  otel-collector/   OTLP front door (collector-first, production-shaped)
  lgtm/             grafana/otel-lgtm — Grafana + Tempo + Loki + Prometheus
harness/
  traffic.py        synthetic business traffic against every app, both versions
  verify.py         signal scorecard: after/ = 3/3 signals, before/ = silent
```

## Quick start

```bash
docker compose up -d --build
python3 harness/traffic.py --iterations 10
python3 harness/verify.py
python3 harness/provision_dashboards.py   # adds the per-app Grafana dashboards
```

Then open **Grafana → http://localhost:3000** (no login):
- **Explore → Tempo**: traces from `fintech-after`
- **Explore → Loki**: `{service_name="fintech-after"}` — business events, trace-correlated
- **Explore → Prometheus**: `transfer_completed_total`, request latency, …

And notice what's *not* there: `fintech-before` — same app, same traffic,
zero signals. That gap is what instrumentation buys you.

## Read the diff

```bash
diff -ru apps/fintech/before apps/fintech/after
```

Every app keeps its instrumentation in dedicated files
(`otel_init.py` / `instrumentation.ts` / `otel.go`) plus minimal call sites,
so the diff *is* the tutorial.

## Use an app standalone

Every `apps/<name>/` directory is self-contained — its own README, Dockerfiles
for both versions, and a standalone `docker-compose.yml`. Copy either version
as a starting point for your own service.

## The contract

[`harness/signals.json`](harness/signals.json) is the machine-readable
contract; CI enforces it on every PR: `after/` must score **traces + logs +
metrics**, `before/` must stay **healthy but silent** (and its manifests are
grepped for OTel dependencies). See [CONVENTIONS.md](CONVENTIONS.md).

This also makes the repo an evaluation harness for **AI-generated
instrumentation**: point your tool at `before/`, let it instrument, and score
the result with `verify.py` against the hand-written `after/` gold standard.

## License

Apache-2.0
