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

/** "8:00 AM" from a "HH:MM[:SS]" time string. */
export function fmt12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}
