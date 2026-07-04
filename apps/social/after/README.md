# hello-otel-social

Go social-network demo service for the `hello-otel` suite.

This branch is the hand-written `otel-manual-cncf` reference: traces, metrics,
and logs all export over OTLP/gRPC to `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Routes

- `GET /` - live control-plane dashboard
- `GET /health` - liveness
- `GET /llms.txt` - plain-text agent description
- `GET /api/agent` - JSON agent manifest
- `GET /api/users`
- `POST /api/users`
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/feed`
- `POST /api/notifications`
- `GET /api/metrics` - legacy JSON counters
- `GET /api/events` - recent business events

## OTel Signals

- Traces: HTTP server spans for every route plus business spans from synthetic traffic
- Metrics: `post.created`, `user.created`, `feed.fetched`, and related counters/histograms
- Logs: structured business events exported as OTel log records with trace correlation

Internal traffic generation is disabled by default on this branch. Set
`ENABLE_TRAFFIC_GEN=true` to run it inside the process; otherwise use the suite
synthetic traffic driver.
