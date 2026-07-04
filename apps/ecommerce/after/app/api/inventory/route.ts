import { NextResponse } from "next/server";
import { getInventoryReport } from "@/lib/store";
import { sleep } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  await sleep(60);
  const report = getInventoryReport();
  const summary = {
    total: report.length,
    in_stock: report.filter((r) => r.status === "in_stock").length,
    low_stock: report.filter((r) => r.status === "low_stock").length,
    out_of_stock: report.filter((r) => r.status === "out_of_stock").length,
  };
  logger.info("inventory.report", { total: summary.total, out_of_stock: summary.out_of_stock, low_stock: summary.low_stock });
  return NextResponse.json({ summary, items: report });
}
