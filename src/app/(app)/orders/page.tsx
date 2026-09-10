import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { fetchCustomers, fetchSuppliers } from "@/lib/khata/db";
import { fetchOrders, type Order } from "@/lib/khata/orders";
import OrdersClient, { type PartyOpt } from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";

  let orders: Order[] = [];
  let parties: PartyOpt[] = [];
  try {
    const [o, c, s] = await Promise.all([
      fetchOrders(db, bid),
      fetchCustomers(db, bid),
      fetchSuppliers(db, bid),
    ]);
    orders = o;
    parties = [
      ...c.map((x) => ({ id: x.id, name: x.name, kind: "customer" as const })),
      ...s.map((x) => ({ id: x.id, name: x.name, kind: "supplier" as const })),
    ];
  } catch {
    /* render empty */
  }

  return <OrdersClient businessId={bid} orders={orders} parties={parties} />;
}
