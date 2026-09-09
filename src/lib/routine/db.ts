import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { RoutineItem, RoutineLog, RoutineStatus } from "./types";

type DB = SupabaseClient<Database>;
type ItemInsert = Database["public"]["Tables"]["shop_routine_items"]["Insert"];

export async function fetchItems(db: DB): Promise<RoutineItem[]> {
  const { data, error } = await db
    .from("shop_routine_items")
    .select("*")
    .order("sort", { ascending: true })
    .order("at_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchLogsForDate(
  db: DB,
  dateKey: string,
): Promise<RoutineLog[]> {
  const { data, error } = await db
    .from("shop_routine_log")
    .select("*")
    .eq("date", dateKey);
  if (error) throw error;
  return data ?? [];
}

export async function fetchLogsBetween(
  db: DB,
  fromKey: string,
  toKey: string,
): Promise<RoutineLog[]> {
  const { data, error } = await db
    .from("shop_routine_log")
    .select("*")
    .gte("date", fromKey)
    .lte("date", toKey);
  if (error) throw error;
  return data ?? [];
}

export function logId(dateKey: string, itemId: string): string {
  return `${dateKey}:${itemId}`;
}

export async function upsertLog(
  db: DB,
  dateKey: string,
  itemId: string,
  status: RoutineStatus,
): Promise<void> {
  const { error } = await db.from("shop_routine_log").upsert(
    {
      id: logId(dateKey, itemId),
      date: dateKey,
      item_id: itemId,
      status,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function clearLog(
  db: DB,
  dateKey: string,
  itemId: string,
): Promise<void> {
  const { error } = await db
    .from("shop_routine_log")
    .delete()
    .eq("id", logId(dateKey, itemId));
  if (error) throw error;
}

/**
 * Add `delta` to an interval item's daily count (e.g. +1 glass of water).
 * Marks the row `done` once it reaches `target` (0 target => stays pending).
 */
export async function bumpCount(
  db: DB,
  dateKey: string,
  itemId: string,
  delta: number,
  target: number,
): Promise<number> {
  const id = logId(dateKey, itemId);
  const { data: existing } = await db
    .from("shop_routine_log")
    .select("count")
    .eq("id", id)
    .maybeSingle();
  const next = Math.max(0, Number(existing?.count ?? 0) + delta);
  const { error } = await db.from("shop_routine_log").upsert(
    {
      id,
      date: dateKey,
      item_id: itemId,
      count: next,
      status: target > 0 && next >= target ? "done" : "pending",
      responded_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
  return next;
}

export async function insertItems(
  db: DB,
  items: ItemInsert[],
): Promise<RoutineItem[]> {
  const { data, error } = await db
    .from("shop_routine_items")
    .insert(items)
    .select("*");
  if (error) throw error;
  return data ?? [];
}

export async function upsertItem(db: DB, item: ItemInsert): Promise<void> {
  const { error } = await db
    .from("shop_routine_items")
    .upsert(item, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteItem(db: DB, id: string): Promise<void> {
  const { error } = await db.from("shop_routine_items").delete().eq("id", id);
  if (error) throw error;
}
