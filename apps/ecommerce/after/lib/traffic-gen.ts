// Background mock traffic generator
// Runs automatically when app starts
// Generates realistic e-commerce scenarios

import { getCart, getProducts, upsertCartItem, createOrder } from "./store";
import { logger } from "./logger";
import {
  checkoutAttempts,
  checkoutValue,
  fraudDeclines,
  paymentFailures,
  cartUpdates,
  ordersCreated,
} from "./metrics";

let isRunning = false;

async function simulateCheckout() {
  const cartId = `cart-${Math.random().toString(36).substr(2, 9)}`;
  const customerId = `customer-${Math.floor(Math.random() * 1000)}`;

  try {
    // Add random items to cart
    const products = getProducts();
    const itemCount = Math.floor(Math.random() * 3) + 1;

    let total = 0;
    for (let i = 0; i < itemCount; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      upsertCartItem(cartId, product.id, quantity);
      total += product.price * quantity;
    }

    checkoutAttempts.add(1, { customerId });
    logger.info("checkout.started", {
      cartId,
      customerId,
      itemCount,
    });

    // Simulate checkout
    await new Promise((r) => setTimeout(r, 100));

    // Random failure rate: 5% fraud, 2% payment fail, 93% success
    const rand = Math.random();
    if (rand < 0.05) {
      fraudDeclines.add(1, { customerId });
      logger.warn("checkout.declined", {
        customerId,
        total,
        reason: "fraud",
      });
    } else if (rand < 0.07) {
      paymentFailures.add(1, { customerId });
      logger.error("payment.failed", {
        customerId,
        total,
        reason: "payment_gateway",
      });
    } else {
      const order = createOrder(customerId, []);
      checkoutValue.record(total, { customerId });
      ordersCreated.add(1, { customerId });
      logger.info("checkout.completed", {
        orderId: order.id,
        customerId,
        total,
      });
    }
  } catch (err) {
    logger.error("traffic_gen_error", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function simulateProductsView() {
  try {
    const products = getProducts();
    logger.info("products.list", {
      count: products.length,
      source: "traffic_gen",
    });
  } catch (err) {
    logger.error("traffic_gen_error", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function startTrafficGenerator() {
  if (isRunning) return;
  isRunning = true;

  console.log("[traffic-gen] Starting mock traffic generator");

  setInterval(async () => {
    const action = Math.random();
    if (action < 0.7) {
      await simulateCheckout();
    } else {
      await simulateProductsView();
    }
  }, 3000 + Math.random() * 4000); // Every 3-7 seconds
}
