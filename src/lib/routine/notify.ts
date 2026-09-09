import { fmt12h, fmtInterval } from "@/lib/format";
import type { RoutineItem } from "./types";

export type NudgeKind = "start" | "ask" | "interval";

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

function notifBody(item: RoutineItem, kind: NudgeKind): string {
  if (kind === "interval") {
    const iv = fmtInterval(item.interval_min || 0);
    return item.target_count
      ? `${item.target_count} ${item.count_unit ?? ""} a day${iv ? ` · ${iv}` : ""}. Tap +1.`
      : `${iv || "Reminder"}. Tap +1 when done.`;
  }
  if (kind === "start") return `Scheduled for ${fmt12h(item.at_time)}.`;
  return item.category === "prayer"
    ? "Tap Done once you've prayed — or Snooze."
    : "Tap Done when it's finished — or Snooze.";
}

const ACTIONS = [
  { action: "done", title: "Done" },
  { action: "snooze", title: "Snooze 15m" },
  { action: "skip", title: "Skip" },
];

const INTERVAL_ACTIONS = [
  { action: "plus", title: "+1" },
  { action: "snooze", title: "Snooze 15m" },
];

/**
 * Fire a routine reminder. Uses the service worker's showNotification (so the
 * Done / Snooze / Skip buttons work and the toast stays put) and falls back to
 * a plain Notification when there's no SW registration.
 */
export async function showRoutineNotif(
  item: RoutineItem,
  dateKey: string,
  kind: NudgeKind,
): Promise<void> {
  if (notifPermission() !== "granted") return;
  const title = notifTitle(item, kind);
  const options = {
    body: notifBody(item, kind),
    tag: `routine-${item.id}`,
    renotify: true,
    requireInteraction: true,
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { itemId: item.id, dateKey, kind },
    actions: kind === "interval" ? INTERVAL_ACTIONS : ACTIONS,
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
      new Notification(title, { body: notifBody(item, kind) });
    } catch {
      /* give up silently */
    }
  }
}

// ---- per-item reminder state (localStorage) --------------------------------

const snoozeKey = (d: string, id: string) => `roznamcha:snooze:${d}:${id}`;
const nudgeKey = (d: string, id: string) => `roznamcha:nudge:${d}:${id}`;

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
