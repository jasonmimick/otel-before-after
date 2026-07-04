import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/store";
import { sleep } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Simulate cache miss → DB lookup
  await sleep(35);

  const product = getProduct(id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}
