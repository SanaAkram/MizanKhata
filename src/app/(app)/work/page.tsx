import { createClient } from "@/lib/supabase/server";
import { fetchSessionsBetween, type WorkSession } from "@/lib/work/db";
import { addDays, dateKey, startOfWeek } from "@/lib/date";
import WorkClient from "./WorkClient";

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

  return (
    <WorkClient initialSessions={initialSessions} todayKey={dateKey(now)} />
  );
}
