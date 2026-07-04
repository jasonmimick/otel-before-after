"use client";

import { useEffect, useRef, useState } from "react";

// Live business-event stream. Polls the /api/events ring buffer every 2.5s
// and renders monospace rows with event-name highlighting; freshly-seen rows
// flash with the accent color.

const POLL_MS = 2500;
const LIMIT = 40;

interface BusinessEvent {
  timestamp: string;
  level: string;
  event: string;
  traceId: string;
  spanId: string;
  fields: Record<string, unknown>;
}

const LEVEL_GLYPH: Record<string, string> = {
  info: "●", // ●
  warn: "▲", // ▲
  error: "✕", // ✕
  debug: "◦", // ◦
};

const LEVEL_COLOR: Record<string, string> = {
  info: "text-accent",
  warn: "text-warn",
  error: "text-err",
  debug: "text-faint",
};

function eventKey(e: BusinessEvent) {
  return `${e.timestamp}|${e.spanId}|${e.event}`;
}

function formatFields(fields: Record<string, unknown>) {
  const parts = Object.entries(fields ?? {}).map(([k, v]) => {
    const val = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
    return `${k}=${val}`;
  });
  return parts.join(" ");
}

export default function EventStream() {
  const [events, setEvents] = useState<BusinessEvent[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/events?limit=${LIMIT}`, { cache: "no-store" });
        if (!res.ok) return;
        const data: { events: BusinessEvent[] } = await res.json();
        if (cancelled) return;

        const incoming = data.events ?? [];
        const freshKeys = new Set<string>();
        for (const e of incoming) {
          const k = eventKey(e);
          if (!seenRef.current.has(k)) {
            seenRef.current.add(k);
            if (!firstLoadRef.current) freshKeys.add(k);
          }
        }
        // Keep the seen-set bounded (ring buffer is capped at 100 server-side).
        if (seenRef.current.size > 500) {
          seenRef.current = new Set(incoming.map(eventKey));
        }
        firstLoadRef.current = false;
        setEvents(incoming);
        setFresh(freshKeys);
      } catch {
        // transient fetch failure — retry next tick
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-panel backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-[11px] font-mono text-[10px] tracking-[0.2em] text-faint">
        <span>RECENT BUSINESS EVENTS</span>
        <span className="text-accent tabular-nums">
          {events === null ? "—" : `${events.length} EVT`}
        </span>
      </div>
      <div className="scroll-slim max-h-[560px] overflow-y-auto font-mono text-[11px]">
        {events === null || events.length === 0 ? (
          <div className="px-3.5 py-[18px] text-faint">
            {events === null ? "connecting…" : "awaiting events — hit /api/traffic to generate a burst"}
          </div>
        ) : (
          events.map((e) => {
            const k = eventKey(e);
            return (
              <div
                key={k}
                className={`flex items-baseline gap-2 border-b border-line-soft px-3.5 py-[7px] ${
                  fresh.has(k) ? "ev-new" : ""
                }`}
              >
                <span className={`w-2 flex-none text-center ${LEVEL_COLOR[e.level] ?? "text-faint"}`}>
                  {LEVEL_GLYPH[e.level] ?? "▸"}
                </span>
                <span className="flex-none text-faint tabular-nums">
                  {e.timestamp.slice(11, 19)}
                </span>
                <span className={`flex-none font-semibold ${LEVEL_COLOR[e.level] ?? "text-slate-200"}`}>
                  {e.event}
                </span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-faint">
                  {formatFields(e.fields)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
