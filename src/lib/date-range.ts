/** Inclusive date range. `from`/`to` are `YYYY-MM-DD` (local) or null = open-ended. */
export type DateRange = { from: string | null; to: string | null };

export const ALL_TIME: DateRange = { from: null, to: null };

export type RangePreset =
  | "all"
  | "month"
  | "lastmonth"
  | "7d"
  | "30d"
  | "year"
  | "custom";

export const PRESET_LABELS: Record<RangePreset, string> = {
  all: "All time",
  month: "This month",
  lastmonth: "Last month",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  year: "This year",
  custom: "Custom",
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Build a concrete range for a preset. `custom` uses the passed from/to. */
export function rangeFor(
  preset: RangePreset,
  from = "",
  to = "",
): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "month":
      return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
    case "lastmonth":
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case "7d": {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { from: ymd(s), to: ymd(now) };
    }
    case "30d": {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      return { from: ymd(s), to: ymd(now) };
    }
    case "year":
      return { from: ymd(new Date(y, 0, 1)), to: ymd(new Date(y, 11, 31)) };
    case "custom":
      return { from: from || null, to: to || null };
    case "all":
    default:
      return ALL_TIME;
  }
}

/** Is an ISO timestamp (or `YYYY-MM-DD`) inside the range? Compares date parts only. */
export function inRange(iso: string | null | undefined, r: DateRange): boolean {
  if (!r.from && !r.to) return true;
  if (!iso) return false;
  const d = iso.slice(0, 10);
  if (r.from && d < r.from) return false;
  if (r.to && d > r.to) return false;
  return true;
}

export function isActive(r: DateRange): boolean {
  return !!(r.from || r.to);
}

/** "1 Aug – 31 Aug 2026" / "since 1 Aug 2026" / "up to 31 Aug 2026". */
export function rangeLabel(r: DateRange): string {
  const fmt = (s: string) =>
    new Date(s + "T00:00:00").toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (r.from && r.to) return `${fmt(r.from)} – ${fmt(r.to)}`;
  if (r.from) return `since ${fmt(r.from)}`;
  if (r.to) return `up to ${fmt(r.to)}`;
  return "All time";
}
