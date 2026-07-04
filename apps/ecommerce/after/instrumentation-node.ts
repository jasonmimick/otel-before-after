// CNCF reference OTel setup: traces + metrics + logs, all over OTLP/HTTP.
// Node-runtime only — loaded via dynamic import from instrumentation.ts so
// webpack never bundles Node-only OTel modules into the Edge runtime build.

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

let sdkStarted = false;

export async function startOtel() {
  if (!sdkStarted) {
    const serviceName = process.env.OTEL_SERVICE_NAME || "hello-otel-ecommerce-otel";
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
      }),
      traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
      }),
      logRecordProcessors: [
        new BatchLogRecordProcessor(
          new OTLPLogExporter({ url: `${endpoint}/v1/logs` })
        ),
      ],
      instrumentations: [getNodeAutoInstrumentations()],
    });

    await sdk.start();
    sdkStarted = true;
    console.log(
      `[otel] SDK started service=${serviceName} endpoint=${endpoint} signals=traces,metrics,logs`
    );
  }

  // External synthetics drive traffic on this branch; opt in explicitly.
  if (process.env.ENABLE_TRAFFIC_GEN === "true") {
    const { startTrafficGenerator } = await import("./lib/traffic-gen");
    startTrafficGenerator();
  }
}
