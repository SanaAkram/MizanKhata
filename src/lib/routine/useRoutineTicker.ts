"use client";

import { useEffect, useState } from "react";
import { dateKey, minutesNow, minutesOfDay } from "@/lib/date";
import type { RoutineItem } from "./types";
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
const NUDGE_MS = 10 * 60 * 1000; // re-nag an unanswered item every 10 min

/**
 * Drives the routine clock and the snooze-style reminder loop while a tab is
 * open. Every ~20s it re-checks each scheduled item; anything still unanswered
 * inside (or past) its window gets re-notified every NUDGE_MS until it's logged
 * or snoozed. Returns `now` (refreshed each tick) for the UI.
 *
 * `loggedTodayIds` = items already answered today (skips + clears their state).
 */
export function useRoutineTicker(
  items: RoutineItem[],
  loggedTodayIds: Set<string>,
): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    let stopped = false;

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

        if (loggedTodayIds.has(it.id)) {
          clearReminderState(dk, it.id);
          continue;
        }

        const startMin = minutesOfDay(it.at_time);
        if (nowMin < startMin) continue; // hasn't started
        // (nowMin naturally < 1440, so we stop nagging at local midnight)

        if (nowMs < snoozedUntil(dk, it.id)) continue;
        if (nowMs - lastNudge(dk, it.id) < NUDGE_MS) continue;

        const endMin = Math.min(startMin + (it.window_min || 0), 24 * 60);
        const kind = nowMin < endMin ? "start" : "ask";
        void showRoutineNotif(it, dk, kind);
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
  }, [items, Array.from(loggedTodayIds).sort().join(",")]);

  return now;
}
