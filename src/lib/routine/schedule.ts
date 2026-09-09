import { minutesOfDay, minutesNow, parseDateKey, dateKey } from "@/lib/date";
import type { RoutineItem, RoutineLog, RoutineStatus } from "./types";

export type Phase = "upcoming" | "active" | "past";

export type Occurrence = {
  item: RoutineItem;
  startMin: number;
  endMin: number;
  start: Date;
  end: Date;
  status: RoutineStatus;
  logged: boolean;
  phase: Phase;
};

function scheduledOn(item: RoutineItem, date: Date): boolean {
  if (!item.enabled) return false;
  const days = item.days ?? [];
  return days.length === 0 || days.includes(date.getDay());
}

/**
 * Build the ordered list of routine occurrences for `viewDateKey`, resolving
 * each one's status against the logs and the current time.
 */
export function buildOccurrences(
  items: RoutineItem[],
  logs: RoutineLog[],
  viewDateKey: string,
  now: Date = new Date(),
): Occurrence[] {
  const date = parseDateKey(viewDateKey);
  const todayKey = dateKey(now);
  const isToday = viewDateKey === todayKey;
  const isPast = viewDateKey < todayKey;
  const nowMin = minutesNow(now);
  const logByItem = new Map(logs.map((l) => [l.item_id, l]));

  return items
    .filter((it) => scheduledOn(it, date))
    .map((item) => {
      const startMin = minutesOfDay(item.at_time);
      const endMin = Math.min(startMin + (item.window_min || 0), 24 * 60);
      const start = new Date(date);
      start.setHours(0, startMin, 0, 0);
      const end = new Date(date);
      end.setHours(0, endMin, 0, 0);

      const log = logByItem.get(item.id);
      const logged = !!log;

      let phase: Phase;
      if (isToday) {
        phase =
          nowMin < startMin ? "upcoming" : nowMin < endMin ? "active" : "past";
      } else {
        phase = isPast ? "past" : "upcoming";
      }

      let status: RoutineStatus;
      if (log) status = log.status as RoutineStatus;
      else if (phase === "past") status = "missed";
      else status = "pending";

      return { item, startMin, endMin, start, end, status, logged, phase };
    })
    .sort((a, b) => a.startMin - b.startMin || a.item.sort - b.item.sort);
}

/** The occurrence whose window is open right now and still unanswered. */
export function activeOccurrence(occs: Occurrence[]): Occurrence | null {
  return (
    occs.find((o) => o.phase === "active" && o.status === "pending") ?? null
  );
}

/** The next occurrence that has not started yet. */
export function nextUpcoming(occs: Occurrence[]): Occurrence | null {
  return occs.find((o) => o.phase === "upcoming") ?? null;
}

/** Past windows with no answer yet — the "did you do it?" catch-up queue. */
export function catchUpQueue(occs: Occurrence[]): Occurrence[] {
  return occs.filter((o) => o.phase === "past" && !o.logged);
}

export type Adherence = { done: number; decided: number; total: number };

export function adherence(occs: Occurrence[]): Adherence {
  let done = 0;
  let decided = 0;
  for (const o of occs) {
    if (o.status === "done") {
      done++;
      decided++;
    } else if (o.status === "missed" || o.status === "skipped") {
      decided++;
    }
  }
  return { done, decided, total: occs.length };
}

/** Hour bounds [startHour, endHour] to render on the timeline for these items. */
export function timelineBounds(items: RoutineItem[]): [number, number] {
  if (items.length === 0) return [5, 23];
  let lo = 24;
  let hi = 0;
  for (const it of items) {
    const s = Math.floor(minutesOfDay(it.at_time) / 60);
    const e = Math.ceil(
      Math.min(minutesOfDay(it.at_time) + (it.window_min || 0), 24 * 60) / 60,
    );
    lo = Math.min(lo, s);
    hi = Math.max(hi, e);
  }
  return [Math.max(0, lo - 1), Math.min(24, Math.max(hi + 1, lo + 3))];
}
