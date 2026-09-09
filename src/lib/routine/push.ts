"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState = "on" | "off" | "unsupported" | "no-key";
export type PushResult = PushState | "denied" | "error";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function hashId(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (!VAPID_PUBLIC) return "no-key";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

export async function enablePush(db: DB): Promise<PushResult> {
  if (!pushSupported()) return "unsupported";
  if (!VAPID_PUBLIC) return "no-key";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          VAPID_PUBLIC,
        ) as BufferSource,
      });
    }

    const json = sub.toJSON();
    const endpoint = json.endpoint ?? "";
    const keys = json.keys ?? {};
    if (!endpoint || !keys.p256dh || !keys.auth) return "error";

    const { error } = await db.from("shop_push_subscriptions").upsert(
      {
        id: await hashId(endpoint),
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        tz_offset_min: -new Date().getTimezoneOffset(),
        user_agent: navigator.userAgent.slice(0, 300),
        last_seen: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) return "error";
    return "on";
  } catch {
    return "error";
  }
}

export async function disablePush(db: DB): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const id = await hashId(sub.endpoint);
    await sub.unsubscribe();
    await db.from("shop_push_subscriptions").delete().eq("id", id);
  } catch {
    /* ignore */
  }
}
