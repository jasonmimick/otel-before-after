import { NextRequest, NextResponse } from "next/server";
import { getOrders, getProduct, createOrder } from "@/lib/store";
import { sleep } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { ordersCreated } from "@/lib/metrics";

export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get("customerId") ?? undefined;

  await sleep(25);

  const orders = getOrders(customerId);
  logger.info("orders.list", { customerId: customerId ?? null, count: orders.length });
  return NextResponse.json({ orders, count: orders.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { customerId, items } = body;

  if (!customerId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "customerId and items required" }, { status: 400 });
  }

  const resolvedItems = [];
  for (const item of items) {
    const product = getProduct(item.productId);
    if (!product) {
      return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
    }
    if (product.stock < item.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 409 });
    }
    resolvedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price });
  }

  await sleep(40);

  const order = createOrder(customerId, resolvedItems);
  ordersCreated.add(1, { customerId });
  logger.info("order.created", { orderId: order.id, customerId, total: order.total, itemCount: order.items.length });
  return NextResponse.json(order, { status: 201 });
}
