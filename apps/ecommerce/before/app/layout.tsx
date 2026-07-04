import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "hello-otel Ecommerce",
  description: "Mock e-commerce API — OTEL instrumentation baseline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
