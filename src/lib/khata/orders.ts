import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DB = SupabaseClient<Database>;
export type Order = Database["public"]["Tables"]["shop_orders"]["Row"];

/** "out" = an order we placed with a supplier (goods coming to us).
 *  "in"  = an order a customer placed with us (goods going out). */
export type OrderDirection = "in" | "out";
export type OrderStatus = "open" | "done" | "cancelled";

export type NewOrder = {
  id: string;
  direction: OrderDirection;
  partyType: "customer" | "supplier" | null;
  partyId: string | null;
  partyName: string | null;
  title: string;
  details: string | null;
  amount: number;
  dueDate: string | null; // YYYY-MM-DD
};

export async function fetchOrders(db: DB, businessId: string): Promise<Order[]> {
  const { data, error } = await db
    .from("shop_orders")
    .select("*")
    .eq("business_id", businessId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addOrder(
  db: DB,
  businessId: string,
  o: NewOrder,
): Promise<void> {
  const { error } = await db.from("shop_orders").insert({
    id: o.id,
    business_id: businessId,
    direction: o.direction,
    party_type: o.partyType,
    party_id: o.partyId,
    party_name: o.partyName,
    title: o.title,
    details: o.details,
    amount: o.amount,
    due_date: o.dueDate,
    status: "open",
  });
  if (error) throw error;
}

export async function updateOrder(
  db: DB,
  id: string,
  patch: Partial<{
    title: string;
    details: string | null;
    amount: number;
    due_date: string | null;
    direction: OrderDirection;
    party_type: string | null;
    party_id: string | null;
    party_name: string | null;
  }>,
): Promise<void> {
  const { error } = await db.from("shop_orders").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setOrderStatus(
  db: DB,
  id: string,
  status: OrderStatus,
): Promise<void> {
  const { error } = await db
    .from("shop_orders")
    .update({
      status,
      delivered_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOrder(db: DB, id: string): Promise<void> {
  const { error } = await db.from("shop_orders").delete().eq("id", id);
  if (error) throw error;
}

// ---- date helpers (local-day based) ---------------------------------

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Whole days from today to `dueKey` (negative = overdue, 0 = today). */
export function daysUntil(dueKey: string | null): number | null {
  if (!dueKey) return null;
  const today = new Date(todayKey() + "T00:00:00");
  const due = new Date(dueKey + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export type OrderBucket = "overdue" | "today" | "soon" | "later" | "nodate";

/** Which urgency bucket an open order falls in (soon = within 2 days). */
export function orderBucket(o: Order): OrderBucket {
  if (o.status !== "open") return "later";
  const d = daysUntil(o.due_date);
  if (d == null) return "nodate";
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 2) return "soon";
  return "later";
}

/** Open orders that need attention now (overdue / due today / due within 2 days). */
export function dueOrders(orders: Order[]): Order[] {
  return orders.filter((o) => {
    const b = orderBucket(o);
    return b === "overdue" || b === "today" || b === "soon";
  });
}
