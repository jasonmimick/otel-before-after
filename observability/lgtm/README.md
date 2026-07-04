# LGTM backend

We use [`grafana/otel-lgtm`](https://github.com/grafana/docker-otel-lgtm) —
one container with the full stock OSS observability stack:

| Component | Signal | API port |
|---|---|---|
| Grafana | UI for everything | 3000 |
| Tempo | traces | 3200 |
| Loki | logs | 3100 |
| Prometheus | metrics | 9090 |

It also accepts OTLP directly (4317/4318), but in this suite apps export to
the **otel-collector first** (`observability/otel-collector/`) because that's
the production-shaped topology; the collector forwards OTLP to this container.

No config needed — the image ships pre-wired datasources. Open
http://localhost:3000 → Explore → pick Tempo/Loki/Prometheus.
