import { fmt12h } from "@/lib/format";

type Kind = "start" | "end";

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

export async function showNotif(
  title: string,
  body: string,
  tag: string,
): Promise<void> {
  if (notifPermission() !== "granted") return;
  const opts: NotificationOptions = {
    body,
    tag,
    icon: "/icon.svg",
    badge: "/icon.svg",
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, { ...opts });
        return;
      }
    }
    new Notification(title, opts);
  } catch {
    try {
      new Notification(title, opts);
    } catch {
      /* give up silently */
    }
  }
}

export function startBody(atTime: string): string {
  return `Scheduled for ${fmt12h(atTime)}.`;
}

const flagKey = (dateKey: string, itemId: string, kind: Kind) =>
  `roznamcha:notified:${dateKey}:${itemId}:${kind}`;

export function wasNotified(
  dateKey: string,
  itemId: string,
  kind: Kind,
): boolean {
  try {
    return localStorage.getItem(flagKey(dateKey, itemId, kind)) === "1";
  } catch {
    return false;
  }
}

export function markNotified(
  dateKey: string,
  itemId: string,
  kind: Kind,
): void {
  try {
    localStorage.setItem(flagKey(dateKey, itemId, kind), "1");
  } catch {
    /* ignore */
  }
}
