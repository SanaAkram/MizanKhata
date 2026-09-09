/** Local YYYY-MM-DD key (no UTC drift). */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD key back to a local Date at midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

/** Monday-based start of the week containing `d`. */
export function startOfWeek(d: Date = new Date()): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (c.getDay() + 6) % 7; // 0 = Monday
  c.setDate(c.getDate() - dow);
  return c;
}

/** [from, to) ISO bounds for a local day, for timestamptz range queries. */
export function dayRangeIso(key: string): { from: string; to: string } {
  const start = parseDateKey(key);
  const end = addDays(start, 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Minutes since local midnight for a "HH:MM[:SS]" string. */
export function minutesOfDay(time: string | null | undefined): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Minutes since local midnight for a Date. */
export function minutesNow(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}
