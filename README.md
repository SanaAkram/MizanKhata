# MizanKhata

A mobile-first personal + shop app: a **work timer**, a **daily routine** (prayers,
shop open/close, health, repeating tasks like water) with time- and interval-based
reminders and a Google-Calendar-style day view, and a full **Digikhata-style shop
suite** — Ledger (customers / suppliers), POS, Stock Book, Bill Book, Cash Book,
and a Dashboard — with multiple businesses per account.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + **Tailwind CSS v4**
- **Supabase** — Postgres, Auth (email/password), Storage (business logos),
  row-level security keyed to `owner_id = auth.uid()`, Edge Function + `pg_cron`
  for background push
- Deploy target: **Vercel**

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

`.env.local` (git-ignored) needs:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<web-push application server key>
```

## Scripts

| command | does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Deploy to Vercel

1. Push to GitHub, import the repo on Vercel (Next.js preset auto-detects).
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for Production + Preview.
3. Deploy.

### Background reminders

Set the Edge Function secrets (`CRON_SECRET`, `VAPID_PUBLIC_JWK`,
`VAPID_PRIVATE_JWK`) in Supabase → Edge Functions → `routine-push` → Secrets.
The `pg_cron` job fires the function every minute. On iPhone, add the app to the
Home Screen (iOS 16.4+) for background notifications to work.

## Project layout

```
src/
  proxy.ts                       session refresh + auth redirect
  lib/
    supabase/{client,server,middleware}.ts
    database.types.ts            generated from the Supabase schema
    routine/                     schedule engine, defaults, notifications, push, sound
    work/db.ts
    khata/
      db.ts / shop-db.ts         ledger + shop queries (all take a businessId)
      business.ts                business list / create / save (client-safe)
      business-active.ts         resolveBusiness (server-only, reads rz_biz cookie)
      bill-share.ts              share / SMS / read-aloud for bills
      seed.ts / seed-data.ts     Digikhata sample data
  app/
    login/
    (app)/                       authed shell (header + bottom nav: Work · Routine · Ledger · Shop)
      work/  routine/  ledger/  cashbook/
      shop/ { pos, stock, stock/[id], stock/reports, bills, settings }
    print/bill/[id]/             standalone printable receipt
reference/                       frozen single-file prototype — not built
```
