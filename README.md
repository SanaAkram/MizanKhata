# Roznamcha

A mobile-first personal daybook for a hardware-shop owner: a **work timer** and a
**daily routine** (prayers, shop open/close, health) with time-based reminders and
a Google-Calendar-style day view.

> **Scope of `main`:** Work + Routine only. The Khata / credit-ledger features
> (Sales, Stock, Customers, Suppliers, Cash Book) are planned for a **separate
> branch** — see [Roadmap](#roadmap). The original single-file prototype that
> specs all of that lives in [`reference/app.html`](reference/app.html).

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **Supabase** — Postgres + Auth (email/password), row-level security keyed to
  `owner_id = auth.uid()`
- Deploy target: **Vercel**

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

### Environment

`.env.local` (already present locally, git-ignored) needs:

```
NEXT_PUBLIC_SUPABASE_URL=https://fksdpsecfnaibquymiir.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
```

Both are safe to expose to the browser — RLS is what protects the data.

### First sign-in

The Supabase project may require email confirmation. Either:

- **Disable it** for quick use: Supabase dashboard → **Authentication → Sign In / Providers →
  Email → turn off "Confirm email"**, then sign up in the app; or
- keep it on and click the confirmation link before the first sign-in.

Sign up with the shop owner's account (`sanaakram582@gmail.com`). Seed ledger
data for that account is imported separately (not needed for Work + Routine).

## Scripts

| command | does |
| --- | --- |
| `npm run dev` | dev server (http://localhost:3000) |
| `npm run build` | production build |
| `npm run start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Deploy to Vercel

1. Push `main` to GitHub.
2. On Vercel: **New Project → import the repo**. Framework preset auto-detects Next.js.
3. Add the two environment variables above (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for Production (and Preview).
4. Deploy. No build-command changes needed.

Supabase Auth works from any origin with the anon key, but for tidy redirects add
the Vercel URL under **Authentication → URL Configuration** in Supabase.

## Project layout

```
src/
  proxy.ts                     session refresh + auth redirect (Next 16 "proxy", ex-middleware)
  lib/
    supabase/{client,server,middleware}.ts   @supabase/ssr clients
    database.types.ts          generated from the Supabase schema
    date.ts / format.ts / ids.ts
    work/db.ts                 work-session queries
    routine/                   schedule engine, defaults, notifications, db
  app/
    login/                     email/password auth
    (app)/                     authed shell (header + bottom nav)
      work/                    timer + today/week totals + session log
      routine/                 due-now card + day timeline + week strip
        settings/              edit routine items & times
      settings/                account + sign out
public/
  sw.js                        minimal service worker (notification clicks)
  manifest.webmanifest, icon.svg
reference/                     frozen prototype (app.html) + old helpers — not built
```

## Notifications

Routine reminders currently fire **while a tab is open** (a 20s ticker + the
Notification API), plus a catch-up prompt when you reopen the app after a
window has passed. True background push (service worker + Web Push + a server
scheduler) is a later phase; the service worker is already registered so it can
be added without restructuring.

## Roadmap

- [ ] Stage 2 branch: Sales (POS), Stock, Ledger (Customers / Suppliers / Cash
      Book), ported from `reference/app.html` — restock payment split, tappable
      ledger entries (edit / delete / WhatsApp share).
- [ ] Background push notifications for routine reminders.
- [ ] Auto prayer times from location instead of manual entry.
