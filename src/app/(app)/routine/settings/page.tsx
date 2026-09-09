import { createClient } from "@/lib/supabase/server";
import { fetchItems } from "@/lib/routine/db";
import type { RoutineItem } from "@/lib/routine/types";
import RoutineSettingsClient from "./RoutineSettingsClient";

export const dynamic = "force-dynamic";

export default async function RoutineSettingsPage() {
  const supabase = await createClient();
  let items: RoutineItem[] = [];
  try {
    items = await fetchItems(supabase);
  } catch {
    /* ignore */
  }
  return <RoutineSettingsClient initialItems={items} />;
}
