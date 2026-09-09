import { newId } from "@/lib/ids";
import type { Database } from "@/lib/database.types";

type NewItem = Database["public"]["Tables"]["shop_routine_items"]["Insert"];

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/**
 * Starter routine for a Gujranwala shopkeeper. Times are approximate and
 * meant to be edited in Routine → Settings. Prayer windows are generous so
 * the "did you pray?" prompt only fires well after the time has entered.
 */
const TEMPLATE: Omit<NewItem, "id">[] = [
  { label: "Fajr", category: "prayer", kind: "scheduled", at_time: "05:00", window_min: 90, days: EVERY_DAY, sort: 10 },
  { label: "Morning walk", category: "health", kind: "scheduled", at_time: "06:45", window_min: 45, days: EVERY_DAY, sort: 20 },
  { label: "Open shop", category: "work", kind: "scheduled", at_time: "08:30", window_min: 60, days: EVERY_DAY, sort: 30 },
  { label: "Drink water", category: "health", kind: "interval", at_time: null, interval_min: 120, active_from: "07:00", active_to: "23:00", target_count: 8, count_unit: "glass", window_min: 0, days: EVERY_DAY, sort: 35 },
  { label: "Dhuhr", category: "prayer", kind: "scheduled", at_time: "12:30", window_min: 150, days: EVERY_DAY, sort: 40 },
  { label: "Asr", category: "prayer", kind: "scheduled", at_time: "16:00", window_min: 120, days: EVERY_DAY, sort: 50 },
  { label: "Maghrib", category: "prayer", kind: "scheduled", at_time: "18:15", window_min: 40, days: EVERY_DAY, sort: 60 },
  { label: "Isha", category: "prayer", kind: "scheduled", at_time: "19:45", window_min: 150, days: EVERY_DAY, sort: 70 },
  { label: "Close shop", category: "work", kind: "scheduled", at_time: "20:30", window_min: 60, days: EVERY_DAY, sort: 80 },
  { label: "Sleep", category: "health", kind: "scheduled", at_time: "23:00", window_min: 60, days: EVERY_DAY, sort: 90 },
];

export function defaultItems(): NewItem[] {
  return TEMPLATE.map((t) => ({ ...t, id: newId("ri_"), enabled: true }));
}

export function blankItem(sort: number): NewItem {
  return {
    id: newId("ri_"),
    label: "",
    category: "other",
    kind: "scheduled",
    at_time: "09:00",
    window_min: 60,
    interval_min: 120,
    active_from: "07:00",
    active_to: "22:00",
    target_count: 0,
    count_unit: "glass",
    days: EVERY_DAY,
    sort,
    enabled: true,
  };
}
