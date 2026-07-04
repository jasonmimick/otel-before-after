"use client";

import { useEffect, useRef, useState } from "react";

// Live metric tiles. Polls /api/metrics (flat snapshot: counters -> number,
// histograms -> { count, sum, avg }) every 2.5s. Each tile shows an animated
// count-up value plus a spark bar of recent activity (per-poll delta for
// counters, per-poll sum delta for the checkout-value histogram).

const POLL_MS = 2500;
const SPARK_LEN = 24;

type Tone = "accent" | "warn" | "err";

interface TileDef {
  key: string;
  label: string;
  kind: "counter" | "histogram";
  unit?: string;
  decimals?: number;
  tone: Tone;
}

const TILE_DEFS: TileDef[] = [
  { key: "checkout_attempts_total", label: "CHECKOUT ATTEMPTS", kind: "counter", tone: "accent" },
  { key: "orders_created_total", label: "ORDERS CREATED", kind: "counter", tone: "accent" },
  { key: "cart_updates_total", label: "CART UPDATES", kind: "counter", tone: "accent" },
  { key: "checkout_value_usd", label: "CHECKOUT VALUE", kind: "histogram", unit: "USD", decimals: 2, tone: "accent" },
  { key: "checkout_fraud_declines_total", label: "FRAUD DECLINES", kind: "counter", tone: "err" },
  { key: "payment_failures_total", label: "PAYMENT FAILURES", kind: "counter", tone: "warn" },
];

interface TileState {
  value: number; // current total (counter) or histogram sum
  sub?: string; // secondary line, e.g. histogram count/avg
  spark: number[];
}

const TONE_TEXT: Record<Tone, string> = {
  accent: "text-accent glow-accent",
  warn: "text-warn glow-warn",
  err: "text-err glow-err",
};

const TONE_BAR: Record<Tone, [string, string]> = {
  accent: ["rgba(34,211,238,0.28)", "#22d3ee"],
  warn: ["rgba(251,191,36,0.28)", "#fbbf24"],
  err: ["rgba(248,113,113,0.28)", "#f87171"],
};

export default function LiveTiles() {
  const [tiles, setTiles] = useState<Record<string, TileState>>({});
  const prevRef = useRef<Record<string, number>>({});
  const sparkRef = useRef<Record<string, number[]>>({});

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/metrics", { cache: "no-store" });
        if (!res.ok) return;
        const data: Record<string, unknown> = await res.json();
        if (cancelled) return;

        const next: Record<string, TileState> = {};
        for (const def of TILE_DEFS) {
          const raw = data[def.key];
          let value = 0;
          let sub: string | undefined;

          if (def.kind === "histogram") {
            const h = (raw ?? {}) as { count?: number; sum?: number; avg?: number };
            value = h.sum ?? 0;
            sub = `n=${h.count ?? 0} · avg ${(h.avg ?? 0).toFixed(2)}`;
          } else {
            value = typeof raw === "number" ? raw : 0;
          }

          const prev = prevRef.current[def.key];
          const delta = prev === undefined ? 0 : Math.max(0, value - prev);
          prevRef.current[def.key] = value;

          const spark = sparkRef.current[def.key] ?? [];
          spark.push(delta);
          if (spark.length > SPARK_LEN) spark.shift();
          sparkRef.current[def.key] = spark;

          next[def.key] = { value, sub, spark: [...spark] };
        }
        setTiles(next);
      } catch {
        // collector-side hiccup — keep last values, try again next tick
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
      {TILE_DEFS.map((def) => {
        const t = tiles[def.key];
        return (
          <div
            key={def.key}
            className="flex min-h-[124px] flex-col rounded-[10px] border border-line bg-panel bg-gradient-to-b from-slate-400/[0.04] to-transparent p-3.5 pb-3 backdrop-blur-md"
          >
            <div className="mb-2 truncate font-mono text-[10.5px] tracking-[0.08em] text-faint">
              {def.label}
            </div>
            <div
              className={`font-mono text-[26px] font-semibold leading-none tabular-nums ${TONE_TEXT[def.tone]}`}
            >
              <CountUp value={t?.value ?? 0} decimals={def.decimals ?? 0} />
              {def.unit ? (
                <span className="ml-1 text-xs text-faint [text-shadow:none]">{def.unit}</span>
              ) : null}
            </div>
            {t?.sub ? (
              <div className="mt-1.5 font-mono text-[10px] tabular-nums text-faint">{t.sub}</div>
            ) : null}
            <Spark values={t?.spark ?? []} tone={def.tone} />
          </div>
        );
      })}
    </div>
  );
}

// Eased count-up toward the latest polled value.
function CountUp({ value, decimals }: { value: number; decimals: number }) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    const duration = 600;
    let raf = 0;

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = value;
    };
  }, [value]);

  return (
    <>
      {shown.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </>
  );
}

// Tiny pure-CSS spark bars (per-poll activity deltas).
function Spark({ values, tone }: { values: number[]; tone: Tone }) {
  const bars = [...Array(Math.max(0, SPARK_LEN - values.length)).fill(0), ...values];
  const max = Math.max(1, ...bars);
  const [dimBar, brightBar] = TONE_BAR[tone];
  return (
    <div className="mt-auto flex h-[26px] items-end gap-[2px] pt-2.5">
      {bars.map((v, i) => (
        <span
          key={i}
          className="min-h-[2px] flex-1 rounded-[1px] transition-[height] duration-500 ease-out"
          style={{
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: i === bars.length - 1 ? brightBar : dimBar,
            boxShadow: i === bars.length - 1 ? `0 0 6px ${dimBar}` : undefined,
            ...(v === 0 && i !== bars.length - 1 ? { height: "2px" } : {}),
          }}
        />
      ))}
    </div>
  );
}
