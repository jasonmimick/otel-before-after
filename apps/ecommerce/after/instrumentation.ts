// Next.js instrumentation hook. Kept runtime-agnostic: the OTel NodeSDK
// lives in instrumentation-node.ts behind a dynamic import so the Edge
// runtime build never sees Node-only modules (fs, net, tls, ...).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startOtel } = await import("./instrumentation-node");
    await startOtel();
  }
}
