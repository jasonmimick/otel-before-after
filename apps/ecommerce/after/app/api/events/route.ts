import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 100);
  const events = getEvents(limit);
  return NextResponse.json({ events, count: events.length });
}
