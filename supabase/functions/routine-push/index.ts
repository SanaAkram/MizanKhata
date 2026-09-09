// Roznamcha — background routine reminders.
// Invoked every minute by pg_cron (see migration `routine_push_cron`).
// Auth: `x-cron-secret` header must equal the CRON_SECRET function secret.
//
// Required function secrets (Supabase → Edge Functions → Manage secrets):
//   CRON_SECRET        — any random string, also used in the cron job
//   VAPID_PUBLIC_JWK   — JSON string, from push-vapid.local.json `pubJwk`
//   VAPID_PRIVATE_JWK  — JSON string, from push-vapid.local.json `privJwk`
//   PUSH_CONTACT       — optional, e.g. "mailto:you@example.com"
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const VAPID_PUBLIC_JWK = Deno.env.get("VAPID_PUBLIC_JWK") ?? "";
const VAPID_PRIVATE_JWK = Deno.env.get("VAPID_PRIVATE_JWK") ?? "";
const CONTACT = Deno.env.get("PUSH_CONTACT") ?? "mailto:admin@roznamcha.app";

const RENAG_EVERY = 10; // minutes
const GRACE_AFTER_WINDOW = 60; // keep nagging this long past the window

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!VAPID_PUBLIC_JWK || !VAPID_PRIVATE_JWK) {
    return json({ error: "VAPID secrets not set" }, 500);
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  const vapidKeys = await webpush.importVapidKeys(
    {
      publicKey: JSON.parse(VAPID_PUBLIC_JWK),
      privateKey: JSON.parse(VAPID_PRIVATE_JWK),
    },
    { extractable: false },
  );
  const appServer = await webpush.ApplicationServer.new({
    contactInformation: CONTACT,
    vapidKeys,
  });

  const { data: subs } = await db
    .from("shop_push_subscriptions")
    .select("*");
  if (!subs || subs.length === 0) return json({ sent: 0, note: "no subs" });

  const byOwner = new Map<string, typeof subs>();
  for (const s of subs) {
    const arr = byOwner.get(s.owner_id) ?? [];
    arr.push(s);
    byOwner.set(s.owner_id, arr);
  }

  const nowUtcMs = Date.now();
  let sent = 0;
  let attempted = 0;

  for (const [ownerId, ownerSubs] of byOwner) {
    const tz = ownerSubs[0].tz_offset_min ?? 300;
    const local = new Date(nowUtcMs + tz * 60_000);
    const dow = local.getUTCDay();
    const localMin = local.getUTCHours() * 60 + local.getUTCMinutes();
    const dateKey = local.toISOString().slice(0, 10);

    const { data: items } = await db
      .from("shop_routine_items")
      .select("id,label,category,at_time,window_min,days,enabled")
      .eq("owner_id", ownerId)
      .eq("enabled", true);
    if (!items || items.length === 0) continue;

    const { data: logs } = await db
      .from("shop_routine_log")
      .select("item_id")
      .eq("owner_id", ownerId)
      .eq("date", dateKey);
    const answered = new Set((logs ?? []).map((l) => l.item_id));

    for (const it of items) {
      const days: number[] = it.days ?? [];
      if (days.length > 0 && !days.includes(dow)) continue;
      if (answered.has(it.id)) continue;

      const [h, m] = String(it.at_time).split(":").map(Number);
      const startMin = h * 60 + (m || 0);
      const endMin = Math.min(startMin + (it.window_min || 0), 24 * 60);
      if (localMin < startMin) continue;
      if (localMin >= endMin + GRACE_AFTER_WINDOW) continue;

      const inWindow = localMin < endMin;
      const since = inWindow ? localMin - startMin : localMin - endMin;
      if (since % RENAG_EVERY !== 0) continue;

      const kind = inWindow ? "start" : "ask";
      const sentId = `${ownerId}:${dateKey}:${it.id}:${kind}:${localMin}`;
      const dup = await db
        .from("shop_push_sent")
        .insert({ id: sentId, owner_id: ownerId });
      if (dup.error) continue; // already sent this minute

      const isPrayer = it.category === "prayer";
      const title =
        kind === "start"
          ? isPrayer
            ? `${it.label} — prayer time`
            : `${it.label} — it's time`
          : isPrayer
            ? `Did you offer ${it.label} prayer?`
            : `${it.label} — done?`;
      const payload = JSON.stringify({
        title,
        body:
          kind === "start"
            ? "Tap Done when finished, or Snooze."
            : "Still not logged — tap Done or Snooze.",
        tag: `routine-${it.id}`,
        itemId: it.id,
        dateKey,
        url: "/routine",
      });

      for (const s of ownerSubs) {
        attempted++;
        try {
          const subscriber = appServer.subscribe({
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          });
          await subscriber.pushTextMessage(payload, {});
          sent++;
        } catch (e) {
          const status =
            (e as { response?: Response })?.response?.status ?? 0;
          if (status === 404 || status === 410) {
            await db
              .from("shop_push_subscriptions")
              .delete()
              .eq("id", s.id);
          }
        }
      }
    }
  }

  return json({ sent, attempted });
});
