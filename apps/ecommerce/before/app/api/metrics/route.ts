import { NextResponse } from "next/server";
import { getMetricsFormatted } from "@/lib/metrics-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    metrics: getMetricsFormatted(),
  });
}
