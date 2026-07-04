# otel-before-after — Plan

**One-liner:** Real apps in three languages, each in two states — `before/`
(zero OpenTelemetry) and `after/` (CNCF-canonical instrumentation) — plus a
stock OSS observability backend, a traffic generator, and a verifier that
proves the signals actually arrive. The diff between `before/` and `after/`
is the product.

## Why this exists

The official OpenTelemetry Demo shows a finished, fully-instrumented system.
Nobody shows the *before*, the exact diff that adds observability, and a
scorecard proving it worked. That's what this repo does — for humans learning
OTel, and as an evaluation harness for AI-generated instrumentation
(each app's `before/` is the scan target; `after/` is the gold standard).

## Structure

```
apps/<name>/before/   # runnable app, structured JSON logs, /metrics JSON, NO OTel
apps/<name>/after/    # same app + traces/metrics/logs over OTLP (collector-first)
apps/<name>/README.md # standalone usage for just this app
observability/otel-collector/   # OTLP front door for all apps
observability/lgtm/             # grafana/otel-lgtm: Grafana+Tempo+Loki+Mimir
harness/traffic.py    # synthetic business traffic
harness/verify.py     # signal scorecard (Tempo/Loki/Prometheus APIs)
harness/signals.json  # the machine-readable signal contract
dashboard/            # (Phase 3) host app: pairs, health, scorecard, diffs
docs/diffs/           # (Phase 3) CI-rendered before→after diff per app
```

## Phases

1. **fintech vertical slice** (FastAPI): before+after+lgtm+collector+harness+CI. ← current
2. Port **ecommerce** (Next.js) and **social** (Go) onto the proven skeleton.
3. **dashboard/** host app + rendered diffs in docs/.
4. Fly.io hosted showcase; archive predecessor repos (hello-otel-suite etc.).

## Definition of done (every app pair, enforced by CI)

- `docker compose up` → traffic → `harness/verify.py`:
  - `after/` scores **3/3** signals (traces in Tempo, logs in Loki, metrics via Prometheus API)
  - `before/` scores **0/3** but passes health checks
- Both versions run standalone from the app directory.
