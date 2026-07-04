import { startTrafficGenerator } from "./lib/traffic-gen";

// CNCF OTel instrumentation is now handled by instrumentation.js (via --require flag)
// This file is retained for Next.js compatibility but no longer registers @vercel/otel

export function register() {
  // Start mock traffic generator for testing
  startTrafficGenerator();
}

