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
  if (item.kind === "interval" || !item.at_time) return false;
  const days = item.days ?? [];
  return days.length === 0 || days.includes(date.getDay());
}

// ---- interval items (drink water, take medicine, …) -----------------

export type IntervalProgress = {
  item: RoutineItem;
  count: number;
  target: number;
  unit: string;
  done: boolean;
  activeNow: boolean; // within the item's active window right now
  nextDueMin: number | null; // minutes from now until the next nudge
};

export function intervalItems(items: RoutineItem[], date: Date): RoutineItem[] {
  const dow = date.getDay();
  return items.filter((it) => {
    if (!it.enabled || it.kind !== "interval") return false;
    const days = it.days ?? [];
    return days.length === 0 || days.includes(dow);
  });
}

export function intervalProgress(
  item: RoutineItem,
  logs: RoutineLog[],
  now: Date = new Date(),
): IntervalProgress {
  const log = logs.find((l) => l.item_id === item.id);
  const count = Number(log?.count ?? 0);
  const target = Number(item.target_count ?? 0);
  const fromMin = minutesOfDay(item.active_from);
  const toMin = minutesOfDay(item.active_to) || 24 * 60;
  const nowMin = minutesNow(now);
  const activeNow = nowMin >= fromMin && nowMin < toMin;
  const every = item.interval_min || 0;
  let nextDueMin: number | null = null;
  if (every > 0 && activeNow) {
    const sinceStart = nowMin - fromMin;
    nextDueMin = every - (sinceStart % every);
  }
  return {
    item,
    count,
    target,
    unit: item.count_unit ?? "time",
    done: target > 0 && count >= target,
    activeNow,
    nextDueMin,
  };
}

/**
 * Turn an interval item (drink water every 2h, 07:00–23:00) into one occurrence
 * per nudge time, so it shows on the day timeline as a recurring task.
 * Occurrence k is "done" once the running count has passed it.
 */
export function intervalOccurrences(
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
  const out: Occurrence[] = [];

  for (const item of intervalItems(items, date)) {
    const every = item.interval_min || 0;
    if (every <= 0) continue;
    const fromMin = minutesOfDay(item.active_from);
    const toMin = minutesOfDay(item.active_to) || 24 * 60;
    const log = logs.find((l) => l.item_id === item.id);
    const count = Number(log?.count ?? 0);

    let k = 0;
    for (let m = fromMin; m < toMin && k < 24; m += every, k++) {
      const startMin = m;
      const endMin = Math.min(m + Math.min(every, 30), toMin);
      const start = new Date(date);
      start.setHours(0, startMin, 0, 0);
      const end = new Date(date);
      end.setHours(0, endMin, 0, 0);

      let phase: Phase;
      if (isToday) {
        phase =
          nowMin < startMin ? "upcoming" : nowMin < endMin ? "active" : "past";
      } else {
        phase = isPast ? "past" : "upcoming";
      }
      const status: RoutineStatus = count > k ? "done" : "pending";
      out.push({
        item,
        startMin,
        endMin,
        start,
        end,
        status,
        logged: count > k,
        phase,
      });
    }
  }
  return out;
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

/**
 * Enabled work items that mark the working day (shop open / close), in day
 * order. Both fixed-time and timer-synced (no at_time) work items qualify:
 * the first is the "opening" marker, the last the "closing" marker.
 */
export function workMarkers(items: RoutineItem[]): RoutineItem[] {
  return items
    .filter(
      (it) => it.enabled && it.category === "work" && it.kind !== "interval",
    )
    .sort((a, b) => a.sort - b.sort);
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
  let lo = 24;
  let hi = 0;
  let any = false;
  for (const it of items) {
    if (!it.enabled) continue;
    if (it.kind === "interval") {
      const f = minutesOfDay(it.active_from);
      const t = minutesOfDay(it.active_to) || 24 * 60;
      lo = Math.min(lo, Math.floor(f / 60));
      hi = Math.max(hi, Math.ceil(t / 60));
      any = true;
    } else if (it.at_time) {
      const s = Math.floor(minutesOfDay(it.at_time) / 60);
      const e = Math.ceil(
        Math.min(minutesOfDay(it.at_time) + (it.window_min || 0), 24 * 60) / 60,
      );
      lo = Math.min(lo, s);
      hi = Math.max(hi, e);
      any = true;
    }
  }
  if (!any) return [5, 23];
  return [Math.max(0, lo - 1), Math.min(24, Math.max(hi + 1, lo + 3))];
}
