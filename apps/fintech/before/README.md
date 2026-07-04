# hello-otel-fintech

Mock fintech API — pre-OTel instrumentation baseline for Pulsar observability coverage testing.

Routes: `/api/accounts` `/api/transactions` `/api/transfers` `/api/loans`

This app intentionally has no OTel instrumentation. Pulsar scans it, detects gaps, and generates remediation specs.

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/otel-coverage.yml`) runs three stages:

1. **Detect** — Pulsar scans the repo for OTel gaps (traces/logs/metrics)
2. **Instrument** — if gaps found, Pulsar opens a PR with instrumentation files
3. **Verify** — after merge, sends test traffic and checks all 3 signals flow

**Required GitHub secrets:**
- `ANTHROPIC_API_KEY` — for Claude Haiku to generate repo-specific instrumentation
- `PULSAR_ENDPOINT` — Pulsar ingest URL (e.g. https://pulsar-production-adcb.up.railway.app)
- `PULSAR_INGEST_TOKEN` — your Pulsar bearer token (from /api/me)

**Required GitHub variables:**
- `VERCEL_APP_URL` — the deployed Vercel URL for this app

To manually trigger a full reset + re-instrumentation cycle:
```bash
gh workflow run otel-coverage.yml -f reset_to_baseline=true
```
