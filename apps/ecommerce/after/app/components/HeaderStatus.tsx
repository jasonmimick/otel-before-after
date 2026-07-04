"use client";

import { useEffect, useState } from "react";

// Clock + live health indicator for the sticky header.
// Polls /api/health every 3s and drives the status dot.
export default function HeaderStatus() {
  const [clock, setClock] = useState("--:--:--Z");
  const [status, setStatus] = useState<"connecting" | "ok" | "bad">("connecting");

  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().slice(11, 19) + "Z");
    tick();
    const clockTimer = setInterval(tick, 1000);

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!cancelled) setStatus(res.ok ? "ok" : "bad");
      } catch {
        if (!cancelled) setStatus("bad");
      }
    };
    poll();
    const healthTimer = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      clearInterval(clockTimer);
      clearInterval(healthTimer);
    };
  }, []);

  const label =
    status === "ok" ? "OPERATIONAL" : status === "bad" ? "UNREACHABLE" : "CONNECTING";

  return (
    <div className="ml-auto flex items-center gap-4">
      <span className="font-mono text-xs text-dim">{clock}</span>
      <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-faint">
        <span
          className={`h-[9px] w-[9px] rounded-full transition-colors duration-300 ${
            status === "ok"
              ? "status-dot-ok"
              : status === "bad"
                ? "status-dot-bad"
                : "bg-slate-600"
          }`}
        />
        {label}
      </span>
    </div>
  );
}
