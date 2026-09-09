/** "3h 12m" / "12m" / "0m" — compact, for totals and session lengths. */
export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** "1:04:09" — H:MM:SS, for the live running timer. */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** "5:12 PM" */
export function fmtTimeOfDay(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "Mon 8 Sep" */
export function fmtDayLabel(d: Date): string {
  return d.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "08:00" (24h) from a "HH:MM[:SS]" time string. */
export function fmtHm(time: string): string {
  const [h, m] = time.split(":");
  return `${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;
}

/** "Rs 1,454,957" — rounded and grouped. */
export function fmtRs(n: number): string {
  return "Rs " + Math.round(Number(n) || 0).toLocaleString("en-US");
}

/** "12 Sep · 5:23 PM" from an ISO string. */
export function fmtEntryDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString([], { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}

/** "8:00 AM" from a "HH:MM[:SS]" time string. */
export function fmt12h(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${ap}`;
}

/** "every 3h" / "every 90m" from minutes. */
export function fmtInterval(min: number): string {
  if (!min || min <= 0) return "";
  if (min % 60 === 0) return `every ${min / 60}h`;
  if (min < 60) return `every ${min}m`;
  return `every ${Math.floor(min / 60)}h ${min % 60}m`;
}
