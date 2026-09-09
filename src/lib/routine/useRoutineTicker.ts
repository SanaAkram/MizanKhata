"use client";

import { useEffect, useState } from "react";
import { dateKey, minutesNow, minutesOfDay } from "@/lib/date";
import type { RoutineItem } from "./types";
import {
  markNotified,
  notifPermission,
  showNotif,
  startBody,
  wasNotified,
} from "./notify";

/**
 * Drives the routine section's clock and fires the two per-item notifications
 * (window start, window end) while a tab is open. Returns `now`, refreshed
 * every 20s, so the UI can recompute what is due.
 *
 * `loggedTodayIds` suppresses the "did you do it?" ping for items already
 * answered.
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
      const nowMin = minutesNow(d);
      const dow = d.getDay();

      for (const it of items) {
        if (!it.enabled) continue;
        const days = it.days ?? [];
        if (days.length > 0 && !days.includes(dow)) continue;
        if (loggedTodayIds.has(it.id)) continue;

        const startMin = minutesOfDay(it.at_time);
        const endMin = Math.min(startMin + (it.window_min || 0), 24 * 60);

        if (
          nowMin >= startMin &&
          nowMin < endMin &&
          !wasNotified(dk, it.id, "start")
        ) {
          void showNotif(
            `${it.label} — it's time`,
            startBody(it.at_time),
            `r-${it.id}`,
          );
          markNotified(dk, it.id, "start");
        }

        if (nowMin >= endMin && !wasNotified(dk, it.id, "end")) {
          void showNotif(
            `Did you: ${it.label}?`,
            "Open Roznamcha to log it.",
            `r-${it.id}`,
          );
          markNotified(dk, it.id, "end");
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 20000);
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
