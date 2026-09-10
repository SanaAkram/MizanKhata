import { createClient } from "@/lib/supabase/server";
import { fetchSessionsBetween, type WorkSession } from "@/lib/work/db";
import { fetchItems } from "@/lib/routine/db";
import { workMarkers } from "@/lib/routine/schedule";
import { addDays, dateKey, startOfWeek } from "@/lib/date";
import WorkClient, { type WorkMarker } from "./WorkClient";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const rangeEnd = addDays(weekStart, 7);

  const supabase = await createClient();
  let initialSessions: WorkSession[] = [];
  try {
    initialSessions = await fetchSessionsBetween(
      supabase,
      weekStart.toISOString(),
      rangeEnd.toISOString(),
    );
  } catch {
    initialSessions = [];
  }

  let workItems: WorkMarker[] = [];
  try {
    const items = await fetchItems(supabase);
    workItems = workMarkers(items).map((i) => ({ id: i.id, label: i.label }));
  } catch {
    workItems = [];
  }

  return (
    <WorkClient
      initialSessions={initialSessions}
      todayKey={dateKey(now)}
      workItems={workItems}
    />
  );
}
