# hello-otel-social

Mock social platform API — pre-OTel instrumentation baseline for Pulsar observability coverage testing.

Routes: `/api/users` `/api/posts` `/api/feed` `/api/notifications`

This app intentionally has no OTel instrumentation. Pulsar scans it, detects gaps, and generates remediation specs.
