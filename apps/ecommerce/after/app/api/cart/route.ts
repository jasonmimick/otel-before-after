import { NextRequest, NextResponse } from "next/server";
import { getCart, upsertCartItem } from "@/lib/store";
import { logger } from "@/lib/logger";
import { cartUpdates } from "@/lib/metrics";

export async function GET(request: NextRequest) {
  const cartId = request.nextUrl.searchParams.get("cartId");
  if (!cartId) return NextResponse.json({ error: "cartId required" }, { status: 400 });
  const cart = getCart(cartId);
  logger.info("cart.get", { cartId, itemCount: cart.items.length });
  return NextResponse.json(cart);
}

export async function PUT(request: NextRequest) {
  const { cartId, productId, quantity } = await request.json();
  if (!cartId || !productId || quantity === undefined) {
    return NextResponse.json({ error: "cartId, productId, quantity required" }, { status: 400 });
  }
  const cart = upsertCartItem(cartId, productId, quantity);
  cartUpdates.add(1, { cartId });
  logger.info("cart.updated", { cartId, productId, quantity, itemCount: cart.items.length });
  return NextResponse.json(cart);
}
