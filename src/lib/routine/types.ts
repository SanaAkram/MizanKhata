import type { Database } from "@/lib/database.types";

export type RoutineItem =
  Database["public"]["Tables"]["shop_routine_items"]["Row"];
export type RoutineLog =
  Database["public"]["Tables"]["shop_routine_log"]["Row"];

export type RoutineCategory = "prayer" | "work" | "health" | "other";
export type RoutineStatus = "pending" | "done" | "missed" | "skipped";

/** "scheduled" = fixed time of day. "interval" = repeats every N minutes. */
export type RoutineKind = "scheduled" | "interval";

/** Units for a countable interval item's daily target. */
export const COUNT_UNITS = [
  "glass",
  "litre",
  "ml",
  "cup",
  "bottle",
  "dose",
  "rep",
  "time",
] as const;
export type CountUnit = (typeof COUNT_UNITS)[number];

export function isInterval(i: RoutineItem): boolean {
  return i.kind === "interval";
}

export const CATEGORY_LABEL: Record<RoutineCategory, string> = {
  prayer: "Prayer",
  work: "Work",
  health: "Health",
  other: "Other",
};

/** Foreground colours per category, used for the timeline left-bar / accents. */
export const CATEGORY_COLOR: Record<RoutineCategory, string> = {
  prayer: "#2f4a34",
  work: "#b8892b",
  health: "#3b7a57",
  other: "#6b7266",
};
