import { NextResponse } from "next/server";
import { getMetricsSnapshot } from "@/lib/metrics-store";
import { COUNTER_NAMES, HISTOGRAM_NAMES } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  // Zero-fill every known instrument so keys are stable before traffic arrives.
  const snapshot: Record<string, unknown> = {};
  for (const name of COUNTER_NAMES) snapshot[name] = 0;
  for (const name of HISTOGRAM_NAMES) snapshot[name] = { count: 0, sum: 0, avg: 0 };
  Object.assign(snapshot, getMetricsSnapshot());

  return NextResponse.json({
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    ...snapshot,
  });
}
