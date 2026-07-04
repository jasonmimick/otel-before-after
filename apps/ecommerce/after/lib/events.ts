// Ring buffer of recent business events, served at /api/events.
// Populated by lib/logger.ts alongside stdout JSON + OTel log records.

export interface BusinessEvent {
  timestamp: string;
  level: string;
  event: string;
  traceId: string;
  spanId: string;
  fields: Record<string, unknown>;
}

const MAX_EVENTS = 100;
const buffer: BusinessEvent[] = [];

export function pushEvent(event: BusinessEvent) {
  buffer.push(event);
  if (buffer.length > MAX_EVENTS) buffer.shift();
}

export function getEvents(limit = 50): BusinessEvent[] {
  return buffer.slice(-limit).reverse();
}
