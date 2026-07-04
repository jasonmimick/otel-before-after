// Simulates variable-latency operations to produce interesting traces
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jitter(baseMs: number, spreadMs: number): number {
  return baseMs + Math.floor(Math.random() * spreadMs);
}

// Simulates an external payment gateway call
export async function chargePayment(amount: number, customerId: string): Promise<{ success: boolean; transactionId: string }> {
  await sleep(jitter(120, 80)); // 120-200ms
  if (amount > 1000) throw new Error("Amount exceeds single-transaction limit");
  return { success: true, transactionId: `txn_${Date.now()}` };
}

// Simulates a fraud check service call
export async function runFraudCheck(customerId: string, amount: number): Promise<{ approved: boolean; score: number }> {
  await sleep(jitter(60, 40)); // 60-100ms
  const score = Math.random();
  return { approved: score < 0.95, score: Math.round(score * 100) / 100 };
}

// Simulates a shipping service call
export async function createShipment(orderId: string): Promise<{ trackingId: string; carrier: string; estimatedDays: number }> {
  await sleep(jitter(90, 60)); // 90-150ms
  const carriers = ["fedex", "ups", "usps"];
  return {
    trackingId: `TRK${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    carrier: carriers[Math.floor(Math.random() * carriers.length)],
    estimatedDays: Math.floor(Math.random() * 5) + 2,
  };
}
