import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "hello-otel-ecommerce — control plane",
  description:
    "Mock e-commerce service with full OpenTelemetry instrumentation — live business metrics, traces, and logs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-shell font-sans text-sm text-slate-200">
        {children}
      </body>
    </html>
  );
}
