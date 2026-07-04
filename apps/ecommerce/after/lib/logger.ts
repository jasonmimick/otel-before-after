// Business-event logger. Every event is emitted three ways:
//   1. structured JSON on stdout (kept for local debugging / log scraping)
//   2. an OTel log record via @opentelemetry/api-logs (exported over OTLP)
//   3. the in-process ring buffer behind /api/events
//
// Trace correlation: when called inside an active span (auto-instrumented
// HTTP handlers), the OTel Logs SDK stamps the record with the active
// trace/span ids automatically; we also include them in the stdout JSON.

import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { trace } from "@opentelemetry/api";
import { pushEvent } from "./events";

type Level = "debug" | "info" | "warn" | "error";
type AnyValueMap = Record<string, any>;

const severityMap: Record<Level, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

function emit(level: Level, event: string, attrs: AnyValueMap = {}): void {
  const spanContext = trace.getActiveSpan()?.spanContext();
  const traceId = spanContext?.traceId ?? "";
  const spanId = spanContext?.spanId ?? "";
  const timestamp = new Date().toISOString();

  const entry = { timestamp, level, event, traceId, spanId, fields: attrs };

  // 1. stdout JSON
  console.log(JSON.stringify(entry));

  // 2. OTel log record (logger resolved per-call so it picks up the global
  //    LoggerProvider registered by NodeSDK after module load)
  logs.getLogger("hello-otel-ecommerce", "1.0.0").emit({
    severityNumber: severityMap[level],
    severityText: level.toUpperCase(),
    body: event,
    attributes: { event, ...attrs },
    timestamp: Date.now(),
  });

  // 3. /api/events ring buffer
  pushEvent(entry);
}

export const logger = {
  debug: (msg: string, attrs?: AnyValueMap) => emit("debug", msg, attrs),
  info: (msg: string, attrs?: AnyValueMap) => emit("info", msg, attrs),
  warn: (msg: string, attrs?: AnyValueMap) => emit("warn", msg, attrs),
  error: (msg: string, attrs?: AnyValueMap) => emit("error", msg, attrs),
};
