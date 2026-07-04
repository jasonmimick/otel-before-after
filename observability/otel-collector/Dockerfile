# Used for Fly.io deploys. Local compose uses the upstream image directly;
# on Fly the upstream scratch-based image fails to spawn under Fly's init,
# so we build from the release tarball on alpine.
FROM alpine:3.21
ARG OTELCOL_VERSION=0.116.1
ADD https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${OTELCOL_VERSION}/otelcol-contrib_${OTELCOL_VERSION}_linux_amd64.tar.gz /tmp/otelcol.tar.gz
RUN tar -xzf /tmp/otelcol.tar.gz -C /usr/local/bin otelcol-contrib && rm /tmp/otelcol.tar.gz
COPY config.yaml /etc/otelcol/config.yaml
ENTRYPOINT ["/usr/local/bin/otelcol-contrib", "--config", "/etc/otelcol/config.yaml"]
