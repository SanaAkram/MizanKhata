import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { isPremium } from "@/lib/auth/profile";
import type { Business } from "@/lib/khata/business";
import { fetchCustomers, fetchSuppliers } from "@/lib/khata/db";
import { fetchProducts, type Product } from "@/lib/khata/shop-db";
import { fetchOrderItems, fetchOrders, type Order, type OrderItem } from "@/lib/khata/orders";
import OrdersClient, { type PartyOpt } from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const db = await createClient();
  const [{ active }, premium] = await Promise.all([
    resolveBusiness(db),
    isPremium(),
  ]);
  const bid = active?.id ?? "";

  let orders: Order[] = [];
  let items: OrderItem[] = [];
  let parties: PartyOpt[] = [];
  let products: Product[] = [];
  try {
    const [o, it, c, s, p] = await Promise.all([
      fetchOrders(db, bid),
      fetchOrderItems(db, bid),
      fetchCustomers(db, bid),
      fetchSuppliers(db, bid),
      fetchProducts(db, bid),
    ]);
    orders = o;
    items = it;
    products = p;
    parties = [
      ...c.map((x) => ({ id: x.id, name: x.name, kind: "customer" as const })),
      ...s.map((x) => ({ id: x.id, name: x.name, kind: "supplier" as const })),
    ];
  } catch {
    /* render empty */
  }

  return (
    <OrdersClient
      businessId={bid}
      businessName={active?.name ?? ""}
      business={(active as Business) ?? null}
      premium={premium}
      orders={orders}
      items={items}
      parties={parties}
      products={products}
    />
  );
}
