import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { newId } from "@/lib/ids";

type DB = SupabaseClient<Database>;
export type Order = Database["public"]["Tables"]["shop_orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["shop_order_items"]["Row"];

/** "out" = an order we placed with a supplier (goods coming to us).
 *  "in"  = an order a customer placed with us (goods going out). */
export type OrderDirection = "in" | "out";
export type OrderStatus = "open" | "done" | "cancelled";

/** A structured line from ItemLinePicker — kept alongside the order's
 *  free-text title/details so the Order Report can add up quantities by
 *  product without re-parsing text two different forms wrote differently. */
export type OrderItemLine = {
  productId: string | null;
  name: string;
  unit: string;
  qty: number;
  rate: number;
};

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
  items?: OrderItemLine[];
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

export async function fetchOrderItems(
  db: DB,
  businessId: string,
): Promise<OrderItem[]> {
  const { data, error } = await db
    .from("shop_order_items")
    .select("*")
    .eq("business_id", businessId);
  if (error) throw error;
  return data ?? [];
}

async function insertOrderItems(
  db: DB,
  businessId: string,
  orderId: string,
  items: OrderItemLine[],
): Promise<void> {
  if (items.length === 0) return;
  const { error } = await db.from("shop_order_items").insert(
    items.map((l) => ({
      id: newId("oi_"),
      business_id: businessId,
      order_id: orderId,
      product_id: l.productId,
      name: l.name,
      unit: l.unit,
      qty: l.qty,
      rate: l.rate,
    })),
  );
  if (error) throw error;
}

/** Replaces an order's structured line items wholesale — simpler and safer
 *  than diffing when the edit form re-collects the whole item list anyway. */
export async function replaceOrderItems(
  db: DB,
  businessId: string,
  orderId: string,
  items: OrderItemLine[],
): Promise<void> {
  const del = await db.from("shop_order_items").delete().eq("order_id", orderId);
  if (del.error) throw del.error;
  await insertOrderItems(db, businessId, orderId, items);
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
  if (o.items?.length) await insertOrderItems(db, businessId, o.id, o.items);
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

// ---- Order Report: how much of each product is on order -------------

export type OrderReportRow = {
  key: string;
  name: string;
  unit: string;
  totalQty: number;
  parties: { name: string; qty: number; orderId: string }[];
};

/** Groups an item under its product_id, or under a name+unit key when it
 *  has none (a line typed free-hand rather than picked from stock). Kept
 *  as one function so the Report totals, the per-product history
 *  drill-down, and the auto-complete check always agree on what counts
 *  as "the same product". */
export function itemKey(it: OrderItem): string {
  return it.product_id ?? `n:${it.name.trim().toLowerCase()}|${it.unit}`;
}

/** Adds up open orders' line items by product, one direction at a time —
 *  "in" = what customers are waiting on us for, "out" = what we still
 *  need to place with suppliers. Orders with no structured items (title
 *  typed free-hand, no picker used) don't contribute a row. Each
 *  contributing party keeps its order_id so the report can link back to
 *  that specific order (to re-open, edit, or re-send it). */
export function buildOrderReport(
  openOrders: Order[],
  items: OrderItem[],
  direction: OrderDirection,
): OrderReportRow[] {
  const ordersById = new Map(
    openOrders.filter((o) => o.direction === direction).map((o) => [o.id, o]),
  );
  const rows = new Map<string, OrderReportRow>();
  for (const it of items) {
    const order = ordersById.get(it.order_id);
    if (!order) continue;
    const key = itemKey(it);
    const row =
      rows.get(key) ??
      ({ key, name: it.name, unit: it.unit, totalQty: 0, parties: [] } as OrderReportRow);
    row.totalQty = Math.round((row.totalQty + Number(it.qty)) * 100) / 100;
    row.parties.push({ name: order.party_name || "", qty: Number(it.qty), orderId: order.id });
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.totalQty - a.totalQty);
}

export type ProductHistoryEntry = {
  orderId: string;
  partyName: string;
  status: OrderStatus;
  date: string;
  qty: number;
  unit: string;
};

/** This product's supplier-order history (identified by a Report row's
 *  key), any status, most recent first — for the Report tab's "view
 *  history" drill-down: of the total quantity needed, how much has
 *  actually been placed with a supplier, with whom and when. Always
 *  "out" direction — the customer orders that make up the demand itself
 *  are already shown as chips on the report row. */
export function productHistory(
  allOrders: Order[],
  items: OrderItem[],
  key: string,
): ProductHistoryEntry[] {
  const ordersById = new Map(
    allOrders.filter((o) => o.direction === "out").map((o) => [o.id, o]),
  );
  const out: ProductHistoryEntry[] = [];
  for (const it of items) {
    if (itemKey(it) !== key) continue;
    const order = ordersById.get(it.order_id);
    if (!order) continue;
    out.push({
      orderId: order.id,
      partyName: order.party_name || "",
      status: order.status as OrderStatus,
      date: order.created_at,
      qty: Number(it.qty),
      unit: it.unit,
    });
  }
  return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

/** The coming Friday (today itself, if today is already Friday) as
 *  YYYY-MM-DD — the default delivery date an order form pre-fills
 *  instead of leaving "no due date" for the shopkeeper to notice later. */
export function nextFridayStr(): string {
  const d = new Date();
  const add = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + add);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export type OrderBucket = "overdue" | "today" | "soon" | "later" | "nodate";

/** How the Order Book decides urgency. Defaults: flag "soon" 2 days out,
 *  "overdue" the moment the due date passes (0 grace). */
export type BucketPrefs = { soonDays: number; graceDays: number };
const DEFAULT_PREFS: BucketPrefs = { soonDays: 2, graceDays: 0 };

export function orderBucket(o: Order, prefs: BucketPrefs = DEFAULT_PREFS): OrderBucket {
  if (o.status !== "open") return "later";
  const d = daysUntil(o.due_date);
  if (d == null) return "nodate";
  if (d < -prefs.graceDays) return "overdue"; // past the grace window
  if (d <= 0) return "today"; // due, or within grace
  if (d <= prefs.soonDays) return "soon";
  return "later";
}

/** Open orders that need attention now (overdue / due today / due soon). */
export function dueOrders(orders: Order[], prefs?: BucketPrefs): Order[] {
  return orders.filter((o) => {
    const b = orderBucket(o, prefs);
    return b === "overdue" || b === "today" || b === "soon";
  });
}
