import { NextResponse } from "next/server";
import { createOrder, upsertCartItem } from "@/lib/store";
import { logger } from "@/lib/logger";
import { cartUpdates, ordersCreated } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const cartId = `demo-${Date.now()}`;
  upsertCartItem(cartId, "p1", 1);
  upsertCartItem(cartId, "p4", 2);
  cartUpdates.add(2, { cartId, source: "traffic" });

  const order = createOrder("customer-demo", [
    { productId: "p1", quantity: 1, unitPrice: 79.99 },
    { productId: "p4", quantity: 2, unitPrice: 49.99 },
  ]);

  ordersCreated.add(1, { source: "traffic" });
  logger.info("traffic.demo", { cartId, orderId: order.id, total: order.total });

  return NextResponse.json({
    ok: true,
    cartId,
    orderId: order.id,
    total: order.total,
    actions: ["cart.updated", "order.created"],
  });
}
