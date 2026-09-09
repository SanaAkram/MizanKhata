import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type WorkSession =
  Database["public"]["Tables"]["shop_work_sessions"]["Row"];

type DB = SupabaseClient<Database>;

export async function fetchSessionsBetween(
  db: DB,
  fromIso: string,
  toIso: string,
): Promise<WorkSession[]> {
  const { data, error } = await db
    .from("shop_work_sessions")
    .select("*")
    .gte("start_time", fromIso)
    .lt("start_time", toIso)
    .order("start_time", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertSession(
  db: DB,
  s: {
    id: string;
    start: string;
    end: string;
    durationMs: number;
    note?: string | null;
  },
): Promise<void> {
  const { error } = await db.from("shop_work_sessions").insert({
    id: s.id,
    start_time: s.start,
    end_time: s.end,
    duration_ms: s.durationMs,
    note: s.note ?? null,
  });
  if (error) throw error;
}

export async function updateSessionNote(
  db: DB,
  id: string,
  note: string,
): Promise<void> {
  const { error } = await db
    .from("shop_work_sessions")
    .update({ note: note.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSession(db: DB, id: string): Promise<void> {
  const { error } = await db.from("shop_work_sessions").delete().eq("id", id);
  if (error) throw error;
}

export function sumDuration(sessions: WorkSession[]): number {
  return sessions.reduce((t, s) => t + (Number(s.duration_ms) || 0), 0);
}
