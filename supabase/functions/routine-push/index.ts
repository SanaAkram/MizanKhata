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

/** Whole days from `fromKey` (YYYY-MM-DD) to `dueKey`; negative = overdue. */
function dayDiff(fromKey: string, dueKey: string): number {
  const a = Date.parse(fromKey + "T00:00:00Z");
  const b = Date.parse(dueKey + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

/** Escalating, companionship-toned copy for a late prayer. */
function prayerNudge(label: string, minsLate: number): string {
  if (minsLate < 5)
    return `It's ${label} time. Chalo mere saath — let's make wudu. 🌊`;
  if (minsLate < 15)
    return `The reward for praying on time is huge. Chalo, wudu karein? 🌊`;
  if (minsLate < 30)
    return `Don't let the moment slip away — you're stronger than the delay. 💪`;
  return `Time is going, but Allah's mercy is waiting. Rukho scrolling, start ${label}. ✨`;
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
    const renag = Math.max(1, Number(ownerSubs[0].renag_min) || 10);
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
    // still fall through to order reminders below even with no routine items

    const { data: logs } = await db
      .from("shop_routine_log")
      .select("item_id,status,count")
      .eq("owner_id", ownerId)
      .eq("date", dateKey);
    const logByItem = new Map((logs ?? []).map((l) => [l.item_id, l]));

    for (const it of items ?? []) {
      const days: number[] = it.days ?? [];
      if (days.length > 0 && !days.includes(dow)) continue;
      const log = logByItem.get(it.id);

      let kind: "start" | "ask" | "interval" | null = null;
      let atMinute = localMin;
      let minsLate = 0;

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
        if (since % renag !== 0) continue;
        kind = inWindow ? "start" : "ask";
        atMinute = localMin;
        minsLate = Math.max(0, localMin - startMin);
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
          ? `${it.target_count} ${u} a day · ${fmtIv(it.interval_min || 0)}.`
          : `${fmtIv(it.interval_min || 0)}.`;
      } else if (kind === "start") {
        title = isPrayer
          ? `${it.label} — prayer time`
          : `${it.label} — it's time`;
        body = isPrayer
          ? `It's time. Chalo mere saath. 🤲`
          : `Chalo, kar lete hain.`;
      } else {
        title = isPrayer
          ? `Did you offer ${it.label} prayer?`
          : `${it.label} — done?`;
        body = isPrayer
          ? prayerNudge(it.label, minsLate)
          : `${it.label} still pending. Chalo, kar lein.`;
      }

      const payload = JSON.stringify({
        title,
        body,
        tag: `routine-${it.id}`,
        kind,
        category: it.category ?? "",
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

    // ---- Order Book reminders --------------------------------------
    // One notification per stage per day: a 2-day and 1-day heads-up at
    // ~09:00, an "is it sent/received?" nudge at ~19:00 on the due day,
    // and a daily overdue nudge at ~10:00.
    const HEADS_UP = 9 * 60; // 09:00
    const OVERDUE_AT = 10 * 60; // 10:00
    const END_OF_DAY = 19 * 60; // 19:00
    const inWin = (target: number) =>
      localMin >= target && localMin < target + 10;

    if (inWin(HEADS_UP) || inWin(OVERDUE_AT) || inWin(END_OF_DAY)) {
      const { data: orders } = await db
        .from("shop_orders")
        .select("id,direction,title,party_name,due_date")
        .eq("owner_id", ownerId)
        .eq("status", "open")
        .not("due_date", "is", null);

      for (const o of orders ?? []) {
        const d = dayDiff(dateKey, o.due_date as string);
        let stage: string | null = null;
        if (inWin(HEADS_UP) && d === 2) stage = "d2";
        else if (inWin(HEADS_UP) && d === 1) stage = "d1";
        else if (inWin(END_OF_DAY) && d === 0) stage = "due";
        else if (inWin(OVERDUE_AT) && d < 0) stage = "late";
        if (!stage) continue;

        const sentId = `${ownerId}:${dateKey}:order:${o.id}:${stage}`;
        const dup = await db
          .from("shop_push_sent")
          .insert({ id: sentId, owner_id: ownerId });
        if (dup.error) continue;

        const who =
          o.party_name ||
          (o.direction === "in" ? "a customer" : "a supplier");
        const what = o.title || "Order";
        let title: string;
        let body: string;
        if (stage === "d2" || stage === "d1") {
          title = `${what} — due ${stage === "d2" ? "in 2 days" : "tomorrow"}`;
          body =
            o.direction === "in"
              ? `Order from ${who}. Get it ready.`
              : `Order to ${who}. Follow up so it arrives on time.`;
        } else if (stage === "due") {
          title = `${what} — due today`;
          body =
            o.direction === "in"
              ? `Is ${who}'s order sent? Open to mark it.`
              : `Did ${who}'s order arrive? Open to mark it.`;
        } else {
          title = `${what} — ${-d} day${-d === 1 ? "" : "s"} late`;
          body =
            o.direction === "in"
              ? `${who} is still waiting. Send it or update the date.`
              : `Still not in from ${who}. Chase it up.`;
        }

        const payload = JSON.stringify({
          title,
          body,
          tag: `order-${o.id}`,
          kind: "order",
          category: "work",
          url: "/orders",
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
  }

  return json({ sent, attempted });
});
