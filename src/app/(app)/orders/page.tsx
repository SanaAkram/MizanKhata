import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { fetchCustomers, fetchSuppliers } from "@/lib/khata/db";
import { fetchProducts, type Product } from "@/lib/khata/shop-db";
import { fetchOrders, type Order } from "@/lib/khata/orders";
import OrdersClient, { type PartyOpt } from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";

  let orders: Order[] = [];
  let parties: PartyOpt[] = [];
  let products: Product[] = [];
  try {
    const [o, c, s, p] = await Promise.all([
      fetchOrders(db, bid),
      fetchCustomers(db, bid),
      fetchSuppliers(db, bid),
      fetchProducts(db, bid),
    ]);
    orders = o;
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
      orders={orders}
      parties={parties}
      products={products}
    />
  );
}
