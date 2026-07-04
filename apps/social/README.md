# social — Go stdlib, before & after OpenTelemetry

A small social-network API (users, posts, feed, notifications) in two states:

- **`before/`** — a good, normal Go stdlib app: structured JSON logs to stdout,
  in-memory JSON counters at `GET /metrics`, `GET /health`. **Zero OpenTelemetry.**
- **`after/`** — the same app with canonical CNCF instrumentation:
  traces + metrics + logs over OTLP (gRPC), `otelhttp`-wrapped routes,
  business metrics and log records. Everything `before/` had still works.

**The point is the diff:**

```bash
diff -ru before/ after/
```

Instrumentation lives in `after/otel.go` plus small hookups in `main.go` and
`lib/logger.go`/`lib/metrics.go`, and the OTel packages added to `go.mod`.

## Run standalone

```bash
# before — no observability stack needed
cd before && go run .
# (or: go build -o social-before . && ./social-before)

# after — point it at any OTLP endpoint (collector or grafana/otel-lgtm)
cd after
OTEL_SERVICE_NAME=social-after OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317 go run .
```

Or with Docker (app pair + LGTM backend, from this directory):

```bash
docker compose up -d --build
# before: http://localhost:8023  after: http://localhost:8022  Grafana: http://localhost:3000
```

## Endpoints (both versions)

| Route | What |
|---|---|
| `GET /health` | liveness |
| `GET /api/metrics` | in-memory JSON business counters |
| `GET /api/users` | list users |
| `POST /api/users` | create user `{username, email}` |
| `GET /api/posts` | list posts |
| `POST /api/posts` | create post `{user_id, content}` |
| `GET /api/feed` | shuffled feed of posts |
| `POST /api/notifications` | send notification `{user_id, message}` |

## Signals emitted by after/

- **Traces**: one server span per request (`otelhttp` wrapping) + business spans
  from the in-process traffic generator
- **Metrics**: `post.created`, `user.created`, `feed.fetched`, `users.list`,
  `posts.list`, `notification.sent` (counters), `http.route.latency_ms`
  (custom histogram), plus `otelhttp` built-ins (`http.server.duration`, …)
- **Logs**: every structured business event, correlated to the active trace
