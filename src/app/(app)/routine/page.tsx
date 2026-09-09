import { createClient } from "@/lib/supabase/server";
import { fetchItems, fetchLogsBetween } from "@/lib/routine/db";
import { addDays, dateKey, startOfWeek } from "@/lib/date";
import type { RoutineItem, RoutineLog } from "@/lib/routine/types";
import RoutineClient from "./RoutineClient";

export const dynamic = "force-dynamic";

export default async function RoutinePage() {
  const now = new Date();
  const ws = startOfWeek(now);

  const supabase = await createClient();
  let items: RoutineItem[] = [];
  let logs: RoutineLog[] = [];
  try {
    items = await fetchItems(supabase);
    logs = await fetchLogsBetween(
      supabase,
      dateKey(ws),
      dateKey(addDays(ws, 6)),
    );
  } catch {
    /* render empty; client shows first-run / retry */
  }

  return (
    <RoutineClient
      initialItems={items}
      initialLogs={logs}
      todayKey={dateKey(now)}
    />
  );
}
