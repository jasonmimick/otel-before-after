import { NextResponse } from "next/server";
import { COUNTER_NAMES, HISTOGRAM_NAMES } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    service: process.env.OTEL_SERVICE_NAME || "hello-otel-ecommerce-otel",
    version: "1.0.0",
    domain: "ecommerce",
    description:
      "Mock e-commerce API (products, cart, checkout, orders) instrumented as the CNCF reference OpenTelemetry app: traces, metrics, and logs over OTLP/HTTP.",
    endpoints: [
      { method: "GET", path: "/", description: "Live observability dashboard" },
      { method: "GET", path: "/health", description: "Health check" },
      { method: "GET", path: "/api/health", description: "Health check alias" },
      { method: "GET", path: "/api/products", description: "List products (optional ?category=)" },
      { method: "GET", path: "/api/products/{id}", description: "Get a single product" },
      { method: "GET", path: "/api/cart", description: "Get a cart (?cartId=)" },
      { method: "PUT", path: "/api/cart", description: "Upsert a cart item { cartId, productId, quantity }" },
      { method: "POST", path: "/api/checkout", description: "Checkout a cart { cartId, customerId } — fraud check, payment, shipment" },
      { method: "GET", path: "/api/orders", description: "List orders (optional ?customerId=)" },
      { method: "POST", path: "/api/orders", description: "Create an order { customerId, items[] }" },
      { method: "GET", path: "/api/orders/{id}", description: "Get a single order" },
      { method: "GET", path: "/api/inventory", description: "Inventory health report" },
      { method: "GET", path: "/api/metrics", description: "Business metrics snapshot (JSON, snake_case keys mirror OTel instruments)" },
      { method: "GET", path: "/api/events", description: "Recent business events ring buffer (optional ?limit=)" },
      { method: "GET", path: "/api/traffic", description: "Generate one burst of demo traffic" },
      { method: "GET", path: "/api/agent", description: "This manifest" },
      { method: "GET", path: "/llms.txt", description: "Plain-text service description for LLMs" },
    ],
    otel: {
      traces: true,
      metrics: [...COUNTER_NAMES, ...HISTOGRAM_NAMES],
      logs: true,
      protocol: "otlp/http",
    },
    health: "/health",
  });
}
