"use client";

import { useEffect, useMemo, useState } from "react";
import { dateKey, minutesNow, minutesOfDay } from "@/lib/date";
import type { RoutineItem, RoutineLog } from "./types";
import {
  clearReminderState,
  lastNudge,
  notifPermission,
  setLastNudge,
  showRoutineNotif,
  snoozedUntil,
} from "./notify";
import { playReminderSound } from "./sound";

const TICK_MS = 20_000;
const NUDGE_MS = 10 * 60 * 1000; // re-nag a scheduled item every 10 min
const SLACK_MS = 30_000; // let the interval fire ~1 tick early

/**
 * Drives the routine clock + the reminder loop while a tab is open.
 * - scheduled items: nag every 10 min while unanswered in/just-past the window
 * - interval items: nag every `interval_min` inside the active window until the
 *   daily target is met
 * Returns `now`, refreshed each tick.
 */
export function useRoutineTicker(
  items: RoutineItem[],
  todayLogs: RoutineLog[],
): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  const logSig = useMemo(
    () =>
      todayLogs
        .map((l) => `${l.item_id}:${l.status}:${l.count}`)
        .sort()
        .join(","),
    [todayLogs],
  );

  useEffect(() => {
    let stopped = false;
    const logByItem = new Map(todayLogs.map((l) => [l.item_id, l]));

    const tick = () => {
      if (stopped) return;
      const d = new Date();
      setNow(d);
      if (notifPermission() !== "granted") return;

      const dk = dateKey(d);
      const nowMs = d.getTime();
      const nowMin = minutesNow(d);
      const dow = d.getDay();

      for (const it of items) {
        if (!it.enabled) continue;
        const days = it.days ?? [];
        if (days.length > 0 && !days.includes(dow)) continue;
        const log = logByItem.get(it.id);

        if (it.kind === "interval") {
          const target = Number(it.target_count) || 0;
          const count = Number(log?.count ?? 0);
          if (target > 0 && count >= target) {
            clearReminderState(dk, it.id);
            continue;
          }
          const fromMin = minutesOfDay(it.active_from);
          const toMin = minutesOfDay(it.active_to) || 24 * 60;
          if (nowMin < fromMin || nowMin >= toMin) continue;
          const every = it.interval_min || 0;
          if (every <= 0) continue;
          if (nowMs < snoozedUntil(dk, it.id)) continue;
          if (nowMs - lastNudge(dk, it.id) < every * 60_000 - SLACK_MS) continue;
          void showRoutineNotif(it, dk, "interval");
          playReminderSound();
          setLastNudge(dk, it.id, nowMs);
          continue;
        }

        // scheduled
        if (log && log.status !== "pending") {
          clearReminderState(dk, it.id);
          continue;
        }
        const startMin = minutesOfDay(it.at_time);
        if (nowMin < startMin) continue;
        if (nowMs < snoozedUntil(dk, it.id)) continue;
        if (nowMs - lastNudge(dk, it.id) < NUDGE_MS) continue;
        const endMin = Math.min(startMin + (it.window_min || 0), 24 * 60);
        void showRoutineNotif(it, dk, nowMin < endMin ? "start" : "ask");
        playReminderSound();
        setLastNudge(dk, it.id, nowMs);
      }
    };

    tick();
    const id = window.setInterval(tick, TICK_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, logSig]);

  return now;
}
