import { fmt12h, fmtInterval } from "@/lib/format";
import { getNudgeMin } from "./sound";
import type { RoutineItem } from "./types";

export type NudgeKind = "start" | "ask" | "interval";

/** How long a "Remind me later" snooze lasts — follows the nudge-interval setting. */
export function snoozeMs(): number {
  return getNudgeMin() * 60 * 1000;
}
/** @deprecated use snoozeMs() — kept so old imports don't break. */
export const SNOOZE_MS = 15 * 60 * 1000;

export function notifSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifPermission(): NotificationPermission {
  return notifSupported() ? Notification.permission : "denied";
}

export async function requestNotif(): Promise<NotificationPermission> {
  if (!notifSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function notifTitle(item: RoutineItem, kind: NudgeKind): string {
  const isPrayer = item.category === "prayer";
  if (kind === "interval") {
    const u = item.count_unit ?? "one";
    return `${item.label} — time for a ${u}`;
  }
  if (kind === "start") {
    return isPrayer
      ? `${item.label} — prayer time`
      : `${item.label} — it's time`;
  }
  return isPrayer
    ? `Did you offer ${item.label} prayer?`
    : `${item.label} — done?`;
}

/**
 * Escalating, companionship-toned copy for a prayer that's being nudged.
 * `minsLate` is how long past the prayer time it is.
 */
export function prayerNudge(label: string, minsLate: number): string {
  if (minsLate < 5)
    return `It's ${label} time. Chalo mere saath — let's make wudu. 🌊`;
  if (minsLate < 15)
    return `The reward for praying on time is huge. Chalo, wudu karein? 🌊`;
  if (minsLate < 30)
    return `Don't let the moment slip away — you're stronger than the delay. 💪`;
  return `Time is going, but Allah's mercy is waiting. Rukho scrolling, start ${label}. ✨`;
}

function notifBody(
  item: RoutineItem,
  kind: NudgeKind,
  minsLate: number,
): string {
  if (kind === "interval") {
    const iv = fmtInterval(item.interval_min || 0);
    return item.target_count
      ? `${item.target_count} ${item.count_unit ?? ""} a day${iv ? ` · ${iv}` : ""}.`
      : `${iv || "Reminder"}.`;
  }
  const isPrayer = item.category === "prayer";
  if (kind === "start") {
    return isPrayer
      ? `It's time. Chalo mere saath. 🤲`
      : `Scheduled for ${fmt12h(item.at_time)}. Chalo, kar lete hain.`;
  }
  // "ask" — being nudged, escalate
  return isPrayer
    ? prayerNudge(item.label, minsLate)
    : `${item.label} still pending. Chalo, kar lein — tap Done when it's finished.`;
}

function actionsFor(item: RoutineItem, kind: NudgeKind) {
  const n = getNudgeMin();
  if (kind === "interval") {
    return [
      { action: "plus", title: "+1" },
      { action: "snooze", title: `Later (${n}m)` },
    ];
  }
  if (item.category === "prayer") {
    return [
      { action: "done", title: "I'm praying now" },
      { action: "snooze", title: `Remind me in ${n}m` },
    ];
  }
  return [
    { action: "done", title: "Done" },
    { action: "snooze", title: `Snooze ${n}m` },
    { action: "skip", title: "Skip" },
  ];
}

/**
 * Fire a routine reminder. Uses the service worker's showNotification (so the
 * action buttons work and the toast stays put) and falls back to a plain
 * Notification when there's no SW registration.
 */
export async function showRoutineNotif(
  item: RoutineItem,
  dateKey: string,
  kind: NudgeKind,
  minsLate = 0,
): Promise<void> {
  if (notifPermission() !== "granted") return;
  const title = notifTitle(item, kind);
  const options = {
    body: notifBody(item, kind, minsLate),
    tag: `routine-${item.id}`,
    renotify: true,
    requireInteraction: true,
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { itemId: item.id, dateKey, kind, category: item.category ?? "" },
    actions: actionsFor(item, kind),
  } as NotificationOptions;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
    }
    new Notification(title, { body: options.body, tag: options.tag });
  } catch {
    try {
      new Notification(title, { body: notifBody(item, kind, minsLate) });
    } catch {
      /* give up silently */
    }
  }
}

// ---- per-item reminder state (localStorage) --------------------------------

const snoozeKey = (d: string, id: string) => `mizankhata:snooze:${d}:${id}`;
const nudgeKey = (d: string, id: string) => `mizankhata:nudge:${d}:${id}`;

export function snoozedUntil(d: string, id: string): number {
  try {
    return Number(localStorage.getItem(snoozeKey(d, id))) || 0;
  } catch {
    return 0;
  }
}

export function setSnooze(d: string, id: string, until: number): void {
  try {
    localStorage.setItem(snoozeKey(d, id), String(until));
  } catch {
    /* ignore */
  }
}

export function lastNudge(d: string, id: string): number {
  try {
    return Number(localStorage.getItem(nudgeKey(d, id))) || 0;
  } catch {
    return 0;
  }
}

export function setLastNudge(d: string, id: string, at: number): void {
  try {
    localStorage.setItem(nudgeKey(d, id), String(at));
  } catch {
    /* ignore */
  }
}

export function clearReminderState(d: string, id: string): void {
  try {
    localStorage.removeItem(snoozeKey(d, id));
    localStorage.removeItem(nudgeKey(d, id));
  } catch {
    /* ignore */
  }
}
