import { getInventoryReport, getOrders, getProducts } from "@/lib/store";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function Home({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const category = searchParams?.category;
  const products = getProducts(category);
  const orders = getOrders();
  const inventory = getInventoryReport();

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const inStock = inventory.filter((item) => item.status === "in_stock").length;
  const lowStock = inventory.filter((item) => item.status === "low_stock").length;
  const outOfStock = inventory.filter((item) => item.status === "out_of_stock").length;

  const categories = ["electronics", "office", "stationery"];

  return (
    <main style={shell}>
      <section style={hero}>
        <div>
          <p style={eyebrow}>Hello OTel Ecommerce</p>
          <h1 style={title}>Storefront and order ops in one place.</h1>
          <p style={lede}>
            Browse products, inspect inventory, and review live order activity for
            the ecommerce observability baseline.
          </p>
        </div>
        <div style={heroActions}>
          <a style={primaryButton} href="/api/products">
            View products API
          </a>
          <a style={secondaryButton} href="/api/orders">
            View orders API
          </a>
        </div>
      </section>

      <section style={statsGrid}>
        <StatCard label="Products" value={products.length.toString()} />
        <StatCard label="Revenue" value={money.format(revenue)} />
        <StatCard label="In stock" value={inStock.toString()} />
        <StatCard label="Low / out" value={`${lowStock} / ${outOfStock}`} />
      </section>

      <section style={panel}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Browse products</h2>
          <div style={filterRow}>
            <FilterLink href="/" active={!category}>
              All
            </FilterLink>
            {categories.map((item) => (
              <FilterLink
                key={item}
                href={`/?category=${item}`}
                active={category === item}
              >
                {item}
              </FilterLink>
            ))}
          </div>
        </div>

        <div style={productGrid}>
          {products.map((product) => (
            <article key={product.id} style={productCard}>
              <div style={productTop}>
                <div>
                  <p style={productCategory}>{product.category}</p>
                  <h3 style={productName}>{product.name}</h3>
                </div>
                <span style={stockBadge(product.stock)}>{product.stock} left</span>
              </div>
              <p style={productDesc}>{product.description}</p>
              <div style={productBottom}>
                <strong style={price}>{money.format(product.price)}</strong>
                <a href={`/api/products/${product.id}`} style={miniLink}>
                  Inspect
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={twoCol}>
        <div style={panel}>
          <h2 style={sectionTitle}>Recent orders</h2>
          <div style={list}>
            {orders.slice(0, 4).map((order) => (
              <div key={order.id} style={listItem}>
                <div>
                  <strong>{order.id}</strong>
                  <div style={muted}>{order.customerId}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{money.format(order.total)}</div>
                  <div style={badge(order.status)}>{order.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={panel}>
          <h2 style={sectionTitle}>Inventory health</h2>
          <div style={list}>
            {inventory.map((item) => (
              <div key={item.productId} style={listItem}>
                <div>
                  <strong>{item.name}</strong>
                  <div style={muted}>{item.productId}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{item.stock} units</div>
                  <div style={badge(item.status)}>{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCard}>
      <div style={muted}>{label}</div>
      <div style={statValue}>{value}</div>
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
    <a href={href} style={active ? activeFilter : filter}>
      {children}
    </a>
  );
}

const shell: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  color: "#0f172a",
  padding: "32px",
};

const hero: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "24px",
  alignItems: "end",
  marginBottom: "24px",
};

const eyebrow: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "10px",
};

const title: React.CSSProperties = {
  fontSize: "42px",
  lineHeight: 1.05,
  margin: 0,
  maxWidth: "12ch",
};

const lede: React.CSSProperties = {
  marginTop: "12px",
  maxWidth: "60ch",
  color: "#334155",
  fontSize: "16px",
};

const heroActions: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const primaryButton: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: "12px",
  background: "#1d4ed8",
  color: "white",
  textDecoration: "none",
  fontWeight: 600,
};

const secondaryButton: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: "12px",
  background: "white",
  color: "#1e293b",
  textDecoration: "none",
  border: "1px solid #cbd5e1",
  fontWeight: 600,
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const statCard: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe4f0",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
};

const statValue: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  marginTop: "8px",
};

const panel: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe4f0",
  borderRadius: "20px",
  padding: "20px",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "18px",
  margin: 0,
};

const filterRow: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const filter: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  color: "#334155",
  textDecoration: "none",
  background: "#f8fafc",
};

const activeFilter: React.CSSProperties = {
  ...filter,
  background: "#1d4ed8",
  color: "white",
  borderColor: "#1d4ed8",
};

const productGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const productCard: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "16px",
  background: "#f8fafc",
};

const productTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
};

const productCategory: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const productName: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: "16px",
};

const productDesc: React.CSSProperties = {
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.5,
  margin: "12px 0",
};

const productBottom: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const price: React.CSSProperties = {
  fontSize: "18px",
};

const miniLink: React.CSSProperties = {
  color: "#1d4ed8",
  textDecoration: "none",
  fontWeight: 600,
};

const twoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px",
  marginTop: "16px",
};

const list: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "12px",
};

const listItem: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "start",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const muted: React.CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
};

function badge(state: string): React.CSSProperties {
  const colors: Record<string, React.CSSProperties> = {
    delivered: { background: "#dcfce7", color: "#166534" },
    shipped: { background: "#dbeafe", color: "#1d4ed8" },
    processing: { background: "#fef3c7", color: "#92400e" },
    pending: { background: "#ede9fe", color: "#6d28d9" },
    cancelled: { background: "#fee2e2", color: "#991b1b" },
    out_of_stock: { background: "#fee2e2", color: "#991b1b" },
    low_stock: { background: "#fef3c7", color: "#92400e" },
    in_stock: { background: "#dcfce7", color: "#166534" },
  };

  return {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "capitalize",
    ...(colors[state] ?? { background: "#e2e8f0", color: "#334155" }),
  };
}

function stockBadge(stock: number): React.CSSProperties {
  if (stock === 0) return badge("out_of_stock");
  if (stock < 10) return badge("low_stock");
  return badge("in_stock");
}
