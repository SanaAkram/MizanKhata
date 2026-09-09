// MizanKhata — background routine reminders. Invoked every minute by pg_cron.
// Auth: x-cron-secret header == CRON_SECRET function secret.
//
// Function secrets (Supabase → Edge Functions → Manage secrets):
//   CRON_SECRET        — random string, also used in the cron job
//   VAPID_PUBLIC_JWK   — JSON string, from push-vapid.local.json `pubJwk`
//   VAPID_PRIVATE_JWK  — JSON string, from push-vapid.local.json `privJwk`
//   PUSH_CONTACT       — optional, e.g. "mailto:you@example.com"

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const VAPID_PUBLIC_JWK = Deno.env.get("VAPID_PUBLIC_JWK") ?? "";
const VAPID_PRIVATE_JWK = Deno.env.get("VAPID_PRIVATE_JWK") ?? "";
const CONTACT = Deno.env.get("PUSH_CONTACT") ?? "mailto:admin@mizankhata.app";

const RENAG_EVERY = 10;
const GRACE_AFTER_WINDOW = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function toMin(t: string | null): number {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fmtIv(min: number): string {
  if (!min) return "";
  if (min % 60 === 0) return `every ${min / 60}h`;
  return `every ${min}m`;
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
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

  const { data: subs } = await db.from("shop_push_subscriptions").select("*");
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
      .select(
        "id,label,category,kind,at_time,window_min,interval_min,active_from,active_to,target_count,count_unit,days,enabled",
      )
      .eq("owner_id", ownerId)
      .eq("enabled", true);
    if (!items || items.length === 0) continue;

    const { data: logs } = await db
      .from("shop_routine_log")
      .select("item_id,status,count")
      .eq("owner_id", ownerId)
      .eq("date", dateKey);
    const logByItem = new Map((logs ?? []).map((l) => [l.item_id, l]));

    for (const it of items) {
      const days: number[] = it.days ?? [];
      if (days.length > 0 && !days.includes(dow)) continue;
      const log = logByItem.get(it.id);

      let kind: "start" | "ask" | "interval" | null = null;
      let atMinute = localMin;

      if (it.kind === "interval") {
        const target = Number(it.target_count) || 0;
        const count = Number(log?.count ?? 0);
        if (target > 0 && count >= target) continue;
        const fromMin = toMin(it.active_from);
        const toMinV = toMin(it.active_to) || 24 * 60;
        if (localMin < fromMin || localMin >= toMinV) continue;
        const every = it.interval_min || 0;
        if (every <= 0) continue;
        if ((localMin - fromMin) % every !== 0) continue;
        kind = "interval";
      } else {
        if (log && log.status && log.status !== "pending") continue;
        const startMin = toMin(it.at_time);
        const endMin = Math.min(startMin + (it.window_min || 0), 24 * 60);
        if (localMin < startMin) continue;
        if (localMin >= endMin + GRACE_AFTER_WINDOW) continue;
        const inWindow = localMin < endMin;
        const since = inWindow ? localMin - startMin : localMin - endMin;
        if (since % RENAG_EVERY !== 0) continue;
        kind = inWindow ? "start" : "ask";
        atMinute = localMin;
      }
      if (!kind) continue;

      const sentId = `${ownerId}:${dateKey}:${it.id}:${kind}:${atMinute}`;
      const dup = await db
        .from("shop_push_sent")
        .insert({ id: sentId, owner_id: ownerId });
      if (dup.error) continue;

      const isPrayer = it.category === "prayer";
      let title: string;
      let body: string;
      if (kind === "interval") {
        const u = it.count_unit ?? "one";
        title = `${it.label} — time for a ${u}`;
        body = it.target_count
          ? `${it.target_count} ${u} a day · ${fmtIv(it.interval_min || 0)}. Tap +1.`
          : `${fmtIv(it.interval_min || 0)}. Tap +1 when done.`;
      } else if (kind === "start") {
        title = isPrayer
          ? `${it.label} — prayer time`
          : `${it.label} — it's time`;
        body = "Tap Done when finished, or Snooze.";
      } else {
        title = isPrayer
          ? `Did you offer ${it.label} prayer?`
          : `${it.label} — done?`;
        body = "Still not logged — tap Done or Snooze.";
      }

      const payload = JSON.stringify({
        title,
        body,
        tag: `routine-${it.id}`,
        kind,
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
          const status = (e as { response?: Response })?.response?.status ?? 0;
          if (status === 404 || status === 410) {
            await db.from("shop_push_subscriptions").delete().eq("id", s.id);
          }
        }
      }
    }
  }

  return json({ sent, attempted });
});
