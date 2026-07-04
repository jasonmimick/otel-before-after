export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export function jitter(baseMs: number, spreadMs: number): number {
  return baseMs + Math.floor(Math.random() * spreadMs);
}
export async function runFraudScore(amount: number, accountId: string): Promise<number> {
  await sleep(jitter(80, 60));
  const base = amount > 5000 ? 0.4 : 0.05;
  return Math.min(1, base + Math.random() * 0.3);
}
export async function processAchTransfer(amount: number): Promise<boolean> {
  await sleep(jitter(200, 150));
  return amount < 100000;
}
export async function runCreditCheck(applicantId: string): Promise<number> {
  await sleep(jitter(150, 100));
  return Math.floor(Math.random() * 300) + 500;
}
