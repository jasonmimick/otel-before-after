export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  description: string;
};

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type Cart = {
  id: string;
  items: CartItem[];
  updatedAt: string;
};

const products: Product[] = [
  { id: "p1", name: "Wireless Headphones", price: 79.99, category: "electronics", stock: 42, description: "Noise-cancelling over-ear headphones" },
  { id: "p2", name: "Mechanical Keyboard", price: 129.99, category: "electronics", stock: 18, description: "Tactile switches, RGB backlight" },
  { id: "p3", name: "Standing Desk Mat", price: 34.99, category: "office", stock: 73, description: "Anti-fatigue comfort mat" },
  { id: "p4", name: "USB-C Hub", price: 49.99, category: "electronics", stock: 55, description: "7-in-1 multiport adapter" },
  { id: "p5", name: "Desk Lamp", price: 39.99, category: "office", stock: 30, description: "LED adjustable arm lamp" },
  { id: "p6", name: "Notebook Set", price: 12.99, category: "stationery", stock: 200, description: "Pack of 3 dotted notebooks" },
  { id: "p7", name: "Cable Organizer", price: 9.99, category: "office", stock: 150, description: "Silicone cable clips, 20-pack" },
  { id: "p8", name: "Webcam 1080p", price: 69.99, category: "electronics", stock: 0, description: "Full HD webcam with built-in mic" },
];

const orders: Order[] = [
  {
    id: "o1",
    customerId: "c1",
    items: [{ productId: "p1", quantity: 1, unitPrice: 79.99 }, { productId: "p4", quantity: 2, unitPrice: 49.99 }],
    total: 179.97,
    status: "delivered",
    createdAt: "2026-06-20T10:00:00Z",
    updatedAt: "2026-06-23T14:00:00Z",
  },
  {
    id: "o2",
    customerId: "c2",
    items: [{ productId: "p2", quantity: 1, unitPrice: 129.99 }],
    total: 129.99,
    status: "processing",
    createdAt: "2026-06-28T09:00:00Z",
    updatedAt: "2026-06-28T09:00:00Z",
  },
  {
    id: "o3",
    customerId: "c1",
    items: [{ productId: "p6", quantity: 3, unitPrice: 12.99 }, { productId: "p7", quantity: 1, unitPrice: 9.99 }],
    total: 48.96,
    status: "shipped",
    createdAt: "2026-06-27T15:30:00Z",
    updatedAt: "2026-06-28T08:00:00Z",
  },
];

const carts: Map<string, Cart> = new Map();

export function getProducts(category?: string): Product[] {
  if (category) return products.filter((p) => p.category === category);
  return products;
}

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getOrders(customerId?: string): Order[] {
  if (customerId) return orders.filter((o) => o.customerId === customerId);
  return orders;
}

export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}

export function createOrder(customerId: string, items: OrderItem[]): Order {
  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const order: Order = {
    id: `o${Date.now()}`,
    customerId,
    items,
    total: Math.round(total * 100) / 100,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  orders.push(order);

  // Decrement stock
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (product) product.stock = Math.max(0, product.stock - item.quantity);
  }

  return order;
}

export function updateOrderStatus(id: string, status: OrderStatus): Order | undefined {
  const order = orders.find((o) => o.id === id);
  if (!order) return undefined;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  return order;
}

export function getCart(cartId: string): Cart {
  if (!carts.has(cartId)) {
    carts.set(cartId, { id: cartId, items: [], updatedAt: new Date().toISOString() });
  }
  return carts.get(cartId)!;
}

export function upsertCartItem(cartId: string, productId: string, quantity: number): Cart {
  const cart = getCart(cartId);
  const existing = cart.items.find((i) => i.productId === productId);
  if (quantity <= 0) {
    cart.items = cart.items.filter((i) => i.productId !== productId);
  } else if (existing) {
    existing.quantity = quantity;
  } else {
    cart.items.push({ productId, quantity });
  }
  cart.updatedAt = new Date().toISOString();
  return cart;
}

export function clearCart(cartId: string): void {
  const cart = getCart(cartId);
  cart.items = [];
  cart.updatedAt = new Date().toISOString();
}

export function getInventoryReport(): { productId: string; name: string; stock: number; status: string }[] {
  return products.map((p) => ({
    productId: p.id,
    name: p.name,
    stock: p.stock,
    status: p.stock === 0 ? "out_of_stock" : p.stock < 10 ? "low_stock" : "in_stock",
  }));
}
