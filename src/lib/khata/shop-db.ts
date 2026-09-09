import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { newId } from "@/lib/ids";

type DB = SupabaseClient<Database>;

export type Product = Database["public"]["Tables"]["shop_products"]["Row"];
export type Sale = Database["public"]["Tables"]["shop_sales"]["Row"];
export type SaleItem =
  Database["public"]["Tables"]["shop_sale_items"]["Row"];
export type Purchase =
  Database["public"]["Tables"]["shop_purchases"]["Row"];

// ---- reads ----------------------------------------------------------

export async function fetchProducts(db: DB): Promise<Product[]> {
  const { data, error } = await db
    .from("shop_products")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchSales(db: DB): Promise<Sale[]> {
  const { data, error } = await db
    .from("shop_sales")
    .select("*")
    .order("time", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSaleItems(db: DB): Promise<SaleItem[]> {
  const { data, error } = await db.from("shop_sale_items").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function fetchPurchases(db: DB): Promise<Purchase[]> {
  const { data, error } = await db
    .from("shop_purchases")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---- cost / value --------------------------------------------------

export function avgCost(
  purchases: Purchase[],
  productId: string,
): number | null {
  const rows = purchases.filter((p) => p.product_id === productId);
  if (rows.length === 0) return null;
  let qty = 0;
  let cost = 0;
  for (const r of rows) {
    qty += Number(r.qty) || 0;
    cost += (Number(r.qty) || 0) * (Number(r.price) || 0);
  }
  return qty > 0 ? cost / qty : null;
}

/** avgCost from purchases, falling back to the product's set purchase price. */
export function effectiveCost(
  product: Pick<Product, "id" | "purchase_price">,
  purchases: Purchase[],
): number {
  return (
    avgCost(purchases, product.id) ?? (Number(product.purchase_price) || 0)
  );
}

export function stockValue(
  products: Product[],
  purchases: Purchase[],
): number {
  return products.reduce(
    (s, p) => s + effectiveCost(p, purchases) * (Number(p.stock) || 0),
    0,
  );
}

export function topSellers(
  saleItems: SaleItem[],
  products: Product[],
  n = 5,
): Array<{ name: string; qty: number; unit: string }> {
  const map = new Map<string, number>();
  for (const it of saleItems) {
    const key = it.product_id ?? it.name;
    map.set(key, (map.get(key) ?? 0) + (Number(it.qty) || 0));
  }
  return [...map.entries()]
    .map(([key, qty]) => {
      const p = products.find((x) => x.id === key);
      const it = saleItems.find((x) => (x.product_id ?? x.name) === key);
      return { name: p?.name ?? it?.name ?? "—", qty, unit: p?.unit ?? "pcs" };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, n);
}

export function grossProfit(
  saleItems: SaleItem[],
  purchases: Purchase[],
  products: Product[] = [],
): number {
  return saleItems.reduce((s, it) => {
    const prod = it.product_id
      ? products.find((p) => p.id === it.product_id)
      : undefined;
    const cost = it.product_id
      ? prod
        ? effectiveCost(prod, purchases)
        : (avgCost(purchases, it.product_id) ?? 0)
      : 0;
    return s + ((Number(it.price) || 0) - cost) * (Number(it.qty) || 0);
  }, 0);
}

// ---- cart / sale --------------------------------------------------

export type CartLine = {
  productId: string;
  name: string;
  unit: string;
  price: number;
  qty: number;
};

export async function completeSale(
  db: DB,
  args: {
    lines: CartLine[];
    paidCash: number;
    creditAmount: number;
    customerId: string | null;
    customerName: string | null;
  },
): Promise<void> {
  const { lines, paidCash, creditAmount, customerId, customerName } = args;
  const total =
    Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
  const saleId = newId("sl_");
  const nowIso = new Date().toISOString();

  let res = await db.from("shop_sales").insert({
    id: saleId,
    time: nowIso,
    total,
    paid_cash: paidCash,
    credit_amount: creditAmount,
    customer_id: customerId,
    customer_name: customerName,
  });
  if (res.error) throw res.error;

  res = await db.from("shop_sale_items").insert(
    lines.map((l) => ({
      id: newId("si_"),
      sale_id: saleId,
      product_id: l.productId,
      name: l.name,
      unit: l.unit,
      price: l.price,
      qty: l.qty,
    })),
  );
  if (res.error) throw res.error;

  // decrement stock
  for (const l of lines) {
    const { data: prod } = await db
      .from("shop_products")
      .select("stock")
      .eq("id", l.productId)
      .single();
    const next = Math.max(
      0,
      Math.round(((Number(prod?.stock) || 0) - l.qty) * 100) / 100,
    );
    await db.from("shop_products").update({ stock: next }).eq("id", l.productId);
  }

  if (paidCash > 0) {
    await db.from("shop_cashbook").insert({
      id: newId("cb_"),
      type: "in",
      amount: paidCash,
      note: "Sale",
      party_type: customerId ? "customer" : null,
      party_id: customerId,
      party_name: customerName,
      date: nowIso,
    });
  }
  if (creditAmount > 0 && customerId) {
    await db.from("shop_khata_tx").insert({
      id: newId("kt_"),
      customer_id: customerId,
      type: "credit",
      amount: creditAmount,
      note: "Bill",
      bill_id: saleId,
      date: nowIso,
    });
  }
}

// ---- restock ----------------------------------------------------

export async function restock(
  db: DB,
  args: {
    productId: string;
    qty: number;
    price: number;
    ref: string | null;
    // optional supplier payment split
    supplierId?: string | null;
    supplierName?: string | null;
    cashPaid?: number; // rest goes on supplier credit
  },
): Promise<void> {
  const { productId, qty, price, ref } = args;
  const nowIso = new Date().toISOString();
  const batchTotal = Math.round(qty * price * 100) / 100;

  let res = await db.from("shop_purchases").insert({
    id: newId("pu_"),
    product_id: productId,
    qty,
    price,
    ref,
    date: nowIso,
  });
  if (res.error) throw res.error;

  const { data: prod } = await db
    .from("shop_products")
    .select("stock")
    .eq("id", productId)
    .single();
  const next = Math.round(((Number(prod?.stock) || 0) + qty) * 100) / 100;
  res = await db.from("shop_products").update({ stock: next }).eq("id", productId);
  if (res.error) throw res.error;

  const cashPaid = Math.max(0, Math.min(args.cashPaid ?? batchTotal, batchTotal));
  const credit = Math.round((batchTotal - cashPaid) * 100) / 100;

  if (cashPaid > 0) {
    await db.from("shop_cashbook").insert({
      id: newId("cb_"),
      type: "out",
      amount: cashPaid,
      note: "Restock" + (ref ? ` (${ref})` : ""),
      party_type: args.supplierId ? "supplier" : null,
      party_id: args.supplierId ?? null,
      party_name: args.supplierName ?? null,
      date: nowIso,
    });
  }
  if (credit > 0 && args.supplierId) {
    await db.from("shop_supplier_tx").insert({
      id: newId("st_"),
      supplier_id: args.supplierId,
      type: "credit",
      amount: credit,
      note: "Restock" + (ref ? ` (${ref})` : ""),
      ref,
      date: nowIso,
    });
  }
}

export async function createProduct(
  db: DB,
  row: {
    id: string;
    name: string;
    unit: string;
    salePrice: number;
    purchasePrice?: number;
    lowStock?: number;
    stock?: number;
  },
): Promise<void> {
  const { error } = await db.from("shop_products").insert({
    id: row.id,
    name: row.name,
    unit: row.unit,
    sale_price: row.salePrice,
    purchase_price: row.purchasePrice ?? 0,
    low_stock: row.lowStock ?? 5,
    stock: row.stock ?? 0,
  });
  if (error) throw error;
}

export async function updateProduct(
  db: DB,
  id: string,
  patch: {
    name?: string;
    unit?: string;
    sale_price?: number;
    purchase_price?: number;
    low_stock?: number;
    stock?: number;
  },
): Promise<void> {
  const { error } = await db.from("shop_products").update(patch).eq("id", id);
  if (error) throw error;
}
