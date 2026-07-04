// Pre-OTel: structured JSON logger
// Emits machine-readable business events to stdout only.
// No OTel SDK — this is the baseline that Pulsar scans for gaps.

type Level = "debug" | "info" | "warn" | "error";
type AnyValueMap = Record<string, any>;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let globalTraceId = generateUUID();

export function setTraceId(traceId: string) {
  globalTraceId = traceId;
}

export function getTraceId(): string {
  return globalTraceId;
}

interface LogEntry {
  timestamp: string;
  level: Level;
  event: string;
  traceId: string;
  spanId: string;
  fields: AnyValueMap;
}

function emit(level: Level, event: string, attrs: AnyValueMap = {}): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    traceId: globalTraceId,
    spanId: generateUUID(),
    fields: attrs,
  };

  console.log(JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, attrs?: AnyValueMap) => emit("debug", msg, attrs),
  info: (msg: string, attrs?: AnyValueMap) => emit("info", msg, attrs),
  warn: (msg: string, attrs?: AnyValueMap) => emit("warn", msg, attrs),
  error: (msg: string, attrs?: AnyValueMap) => emit("error", msg, attrs),
};
