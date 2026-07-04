import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/store";
import { sleep } from "@/lib/utils";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? undefined;

  await sleep(20);

  const products = getProducts(category);
  logger.info("products.list", { category: category ?? null, count: products.length });
  return NextResponse.json({ products, count: products.length });
}
