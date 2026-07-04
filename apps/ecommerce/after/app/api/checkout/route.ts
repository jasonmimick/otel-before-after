import { NextRequest, NextResponse } from "next/server";
import { getCart, getProduct, createOrder, clearCart } from "@/lib/store";
import { chargePayment, runFraudCheck, createShipment } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { checkoutAttempts, checkoutValue, fraudDeclines, paymentFailures } from "@/lib/metrics";

export async function POST(request: NextRequest) {
  const { cartId, customerId } = await request.json();
  if (!cartId || !customerId) {
    return NextResponse.json({ error: "cartId and customerId required" }, { status: 400 });
  }

  const cart = getCart(cartId);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  checkoutAttempts.add(1, { customerId });
  logger.info("checkout.started", { cartId, customerId, itemCount: cart.items.length });

  const resolvedItems = [];
  let total = 0;
  for (const item of cart.items) {
    const product = getProduct(item.productId);
    if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
    if (product.stock < item.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 409 });
    }
    resolvedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price });
    total += product.price * item.quantity;
  }
  total = Math.round(total * 100) / 100;

  logger.info("fraud.check", { customerId, total });
  const fraud = await runFraudCheck(customerId, total);
  if (!fraud.approved) {
    fraudDeclines.add(1, { customerId });
    logger.warn("checkout.declined", { customerId, total, fraudScore: fraud.score });
    return NextResponse.json({ error: "Transaction declined by fraud detection", score: fraud.score }, { status: 402 });
  }

  let charge;
  try {
    charge = await chargePayment(total, customerId);
  } catch (err) {
    paymentFailures.add(1, { customerId });
    logger.error("payment.failed", { customerId, total, error: (err as Error).message });
    return NextResponse.json({ error: (err as Error).message }, { status: 402 });
  }

  const order = createOrder(customerId, resolvedItems);
  const shipment = await createShipment(order.id);
  clearCart(cartId);

  checkoutValue.record(total, { customerId });
  logger.info("checkout.completed", { orderId: order.id, customerId, total, transactionId: charge.transactionId, carrier: shipment.carrier });

  return NextResponse.json({
    orderId: order.id,
    total,
    transactionId: charge.transactionId,
    tracking: shipment,
    fraudScore: fraud.score,
  }, { status: 201 });
}
