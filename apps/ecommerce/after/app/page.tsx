import { getInventoryReport, getOrders, getProducts } from "@/lib/store";
import HeaderStatus from "./components/HeaderStatus";
import LiveTiles from "./components/LiveTiles";
import EventStream from "./components/EventStream";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const CATEGORIES = ["electronics", "office", "stationery"];

const STATUS_STYLE: Record<string, string> = {
  delivered: "text-ok border-ok/30 bg-ok/10",
  shipped: "text-accent border-accent/30 bg-accent-soft",
  processing: "text-warn border-warn/30 bg-warn/10",
  pending: "text-dim border-line bg-slate-400/10",
  cancelled: "text-err border-err/30 bg-err/10",
  in_stock: "text-ok border-ok/30 bg-ok/10",
  low_stock: "text-warn border-warn/30 bg-warn/10",
  out_of_stock: "text-err border-err/30 bg-err/10",
};

export default function Home({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const category = searchParams?.category;
  const products = getProducts(category);
  const orders = getOrders();
  const inventory = getInventoryReport();

  return (
    <>
      {/* ---- sticky header ---- */}
      <header className="sticky top-0 z-10 flex items-center gap-3.5 border-b border-line bg-shell/75 px-6 py-3.5 backdrop-blur-xl">
        <span className="font-mono text-[15px] font-semibold tracking-[0.02em]">
          hello-otel-ecommerce <span className="text-faint">{"//"}</span>{" "}
          <span className="text-faint">control plane</span>
        </span>
        <span className="rounded border border-accent/35 bg-accent-soft px-2 py-[3px] font-mono text-[10px] tracking-[0.18em] text-accent">
          HELLO-OTEL SUITE
        </span>
        <HeaderStatus />
      </header>

      <main className="relative z-[1] mx-auto max-w-[1280px] p-6">
        {/* ---- signal strip ---- */}
        <div className="mb-[22px] flex flex-wrap gap-2.5">
          <Signal>
            <b className="font-semibold text-accent">TRACES</b> OTLP/HTTP
          </Signal>
          <Signal>
            <b className="font-semibold text-accent">METRICS</b> OTLP/HTTP · 10s
          </Signal>
          <Signal>
            <b className="font-semibold text-accent">LOGS</b> OTLP/HTTP · trace-correlated
          </Signal>
          <Signal>
            DOMAIN <b className="font-semibold text-accent">ECOMMERCE</b> — products · cart ·
            checkout · orders
          </Signal>
        </div>

        {/* ---- live metrics + event stream ---- */}
        <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_400px]">
          <section>
            <SectionLabel>LIVE BUSINESS METRICS · /api/metrics · 2.5s POLL</SectionLabel>
            <LiveTiles />
          </section>
          <section>
            <SectionLabel>EVENT STREAM · /api/events</SectionLabel>
            <EventStream />
          </section>
        </div>

        {/* ---- catalog ---- */}
        <section className="mt-[26px]">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-3">
            <SectionLabel className="mb-0">
              CATALOG · {products.length} SKU{products.length === 1 ? "" : "S"}
            </SectionLabel>
            <nav className="flex gap-1.5 font-mono text-[10.5px] tracking-[0.08em]">
              <FilterLink href="/" active={!category}>
                ALL
              </FilterLink>
              {CATEGORIES.map((c) => (
                <FilterLink key={c} href={`/?category=${c}`} active={category === c}>
                  {c.toUpperCase()}
                </FilterLink>
              ))}
            </nav>
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-line bg-panel backdrop-blur-md">
            <table className="w-full border-collapse font-mono text-[11.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[10px] tracking-[0.18em] text-faint">
                  <th className="px-3.5 py-[11px] font-normal">SKU</th>
                  <th className="px-3.5 py-[11px] font-normal">NAME</th>
                  <th className="hidden px-3.5 py-[11px] font-normal md:table-cell">CATEGORY</th>
                  <th className="hidden px-3.5 py-[11px] font-normal lg:table-cell">DESCRIPTION</th>
                  <th className="px-3.5 py-[11px] text-right font-normal">PRICE</th>
                  <th className="px-3.5 py-[11px] text-right font-normal">STOCK</th>
                  <th className="px-3.5 py-[11px] text-right font-normal">API</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-line-soft last:border-b-0">
                    <td className="px-3.5 py-2 text-faint">{p.id}</td>
                    <td className="px-3.5 py-2 text-slate-200">{p.name}</td>
                    <td className="hidden px-3.5 py-2 text-dim md:table-cell">{p.category}</td>
                    <td className="hidden max-w-[320px] truncate px-3.5 py-2 text-faint lg:table-cell">
                      {p.description}
                    </td>
                    <td className="px-3.5 py-2 text-right tabular-nums text-accent glow-accent">
                      {money.format(p.price)}
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <StatusBadge status={stockStatus(p.stock)}>
                        {p.stock === 0 ? "0" : p.stock} u
                      </StatusBadge>
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <a
                        className="text-accent hover:underline"
                        href={`/api/products/${p.id}`}
                      >
                        inspect
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- orders + inventory ---- */}
        <div className="mt-[26px] grid items-start gap-[18px] md:grid-cols-2">
          <section>
            <SectionLabel>RECENT ORDERS · /api/orders</SectionLabel>
            <Panel>
              {orders.slice(0, 6).map((o) => (
                <div
                  key={o.id}
                  className="flex items-baseline gap-3 border-b border-line-soft px-3.5 py-[9px] font-mono text-[11.5px] last:border-b-0"
                >
                  <span className="text-slate-200">{o.id}</span>
                  <span className="text-faint">{o.customerId}</span>
                  <span className="text-faint">
                    {o.items.length} item{o.items.length === 1 ? "" : "s"}
                  </span>
                  <span className="ml-auto tabular-nums text-accent glow-accent">
                    {money.format(o.total)}
                  </span>
                  <StatusBadge status={o.status}>{o.status}</StatusBadge>
                </div>
              ))}
            </Panel>
          </section>

          <section>
            <SectionLabel>INVENTORY HEALTH · /api/inventory</SectionLabel>
            <Panel>
              {inventory.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-baseline gap-3 border-b border-line-soft px-3.5 py-[9px] font-mono text-[11.5px] last:border-b-0"
                >
                  <span className="text-faint">{item.productId}</span>
                  <span className="truncate text-slate-200">{item.name}</span>
                  <span className="ml-auto tabular-nums text-dim">{item.stock} u</span>
                  <StatusBadge status={item.status}>
                    {item.status.replace(/_/g, " ")}
                  </StatusBadge>
                </div>
              ))}
            </Panel>
          </section>
        </div>

        {/* ---- traffic ---- */}
        <section className="mt-[26px]">
          <SectionLabel>TRAFFIC</SectionLabel>
          <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line bg-panel px-3.5 py-3 font-mono text-[11.5px] text-dim backdrop-blur-md">
            <span>synthetics hit this service every 15s ·</span>
            <a className="text-accent hover:underline" href="/api/traffic">
              /api/traffic → generate a checkout burst
            </a>
            <a
              className="text-accent hover:underline"
              href="https://hello-otel-synthetics.fly.dev"
              target="_blank"
              rel="noreferrer"
            >
              open synthetics ↗
            </a>
          </div>
        </section>
      </main>

      {/* ---- footer ---- */}
      <footer className="relative z-[1] mx-auto mt-2 flex w-full max-w-[1280px] flex-wrap items-center gap-[18px] border-t border-line px-6 pb-7 pt-[18px] font-mono text-[11.5px] text-faint">
        <FooterLink href="/api/metrics" />
        <FooterLink href="/api/agent" />
        <FooterLink href="/llms.txt" />
        <FooterLink href="/api/health" />
        <span className="ml-auto">otel: traces · metrics · logs → OTLP/HTTP</span>
      </footer>
    </>
  );
}

function Signal({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] text-dim backdrop-blur">
      {children}
    </span>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`mb-2.5 ml-0.5 font-mono text-[10px] tracking-[0.22em] text-faint ${className}`}>
      {children}
    </p>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-panel backdrop-blur-md">
      {children}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`rounded border px-2.5 py-1 transition-colors ${
        active
          ? "border-accent/35 bg-accent-soft text-accent"
          : "border-line text-faint hover:border-accent/35 hover:text-accent"
      }`}
    >
      {children}
    </a>
  );
}

function StatusBadge({
  status,
  children,
}: {
  status: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-1.5 py-px font-mono text-[10px] tracking-[0.06em] ${
        STATUS_STYLE[status] ?? "text-dim border-line bg-slate-400/10"
      }`}
    >
      {children}
    </span>
  );
}

function FooterLink({ href }: { href: string }) {
  return (
    <a className="text-accent hover:underline" href={href}>
      {href}
    </a>
  );
}

function stockStatus(stock: number): string {
  if (stock === 0) return "out_of_stock";
  if (stock < 10) return "low_stock";
  return "in_stock";
}
