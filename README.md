# MizanKhata

**A digital daybook for Pakistani shopkeepers** — udhaar (credit) ledger, cash book, stock, bills, orders and profit reports — combined with a personal **daily routine** (prayer times, shop open/close, water and health reminders) and a **work timer**. It is a mobile-first web app that installs to the home screen like an app, works in **English, Urdu and Roman Urdu**, and can import an existing Digikhata statement.

Live: deployed on Vercel · Backend: Supabase (Postgres, Auth, Storage, Edge Functions)

## Features

| Area | What it does |
|---|---|
| **Work** | Start/stop timer for the working day; sessions are saved and the total time is shown |
| **Routine** | Daily schedule of fixed-time items (Fajr … Isha, open/close shop, walk, sleep) and repeating interval items (e.g. drink water every 2 h, with a daily target). Day timeline + week strip, "due now" card, done / skip / snooze, editable in Routine settings |
| **Reminders** | In-app alerts while the app is open **and** background Web Push through an Edge Function, so phones are notified even when the app is closed (prayer nudges escalate the later you are) |
| **Ledger** | Customers and suppliers with a running balance. Two entry types — *You gave* / *You got* — in a Digikhata-style two-column view with a balance column. Entries can include **items from stock**: a "You gave" entry with items creates a real bill (or a purchase for suppliers) and offers to print / share it |
| **POS** | Quick sale screen: typeable quantities, per-line rate, walk-in or credit sale to a customer, sale to a supplier |
| **Stock** | Products, quantities, stock movements per item and stock reports |
| **Bills** | Bill book with Total / Previous amount / Grand total, print or PDF (`/print/bill/[id]`), share by WhatsApp / SMS / read-aloud, or **save & share as an image** (logo + theme). Purchase slips at `/print/purchase/[id]` |
| **Cash Book** | Daily cash in / out |
| **Expenses & Reports** | Categorised expenses, profit-and-loss summary and charts |
| **Order Book** | Customer orders (items without prices) with due dates, statuses, overdue / due-soon thresholds (Shop settings → Orders), push reminders ("Did X's order arrive?") and **share an order as a photo** |
| **Digikhata import** | Upload Digikhata statement PDFs; parties, opening balances, entries and cash days are parsed in the browser (pdf.js), checked against the stated net balance and merged without duplicates |
| **Businesses** | Several businesses per account; every screen is scoped to the active business |
| **Languages** | English, Urdu (RTL) and Roman Urdu, switchable in Settings |
| **Account** | E-mail + password sign-up with an e-mailed one-time code, password reset, change password / e-mail, profile |
| **Premium** | Optional tier — your own logo and colours on bills (free bills carry a small "Made with MizanKhata" credit) |
| **PWA** | Installable (manifest + service worker), opens to the last screen; a public landing page explains the product |

## Architecture

```
Browser (PWA)  ──────────────►  Next.js 16 on Vercel (App Router, React 19, server components + server actions)
  Tailwind v4 UI                    │  src/proxy.ts  refreshes the Supabase session, redirects unauthenticated users to /login
  Service worker (sw.js)            ▼
  Web Push subscription      Supabase
                               ├─ Postgres  (tables prefixed shop_*, row-level security: owner_id = auth.uid())
                               ├─ Auth      (email + password, OTP verification)
                               ├─ Storage   (business logos)
                               └─ Edge Function  routine-push  ◄── pg_cron, every minute (x-cron-secret)
                                       │ reads routine items / logs / orders / push subscriptions
                                       ▼
                                  Web Push (VAPID) ─► the user's phone
```

- **Data access** is done from the app with the Supabase client under the signed-in user; row-level security keeps every business's data private.
- **Business scoping:** `shop-db.ts` / `db.ts` queries all take a `businessId`; the active one is stored in the `rz_biz` cookie and resolved on the server (`business-active.ts`).
- **Reminders:** the client ticker (`useRoutineTicker`) handles in-app alerts; the `routine-push` Edge Function sends the background pushes, de-duplicating through the `shop_push_sent` table.
- **i18n:** a small in-house dictionary (`i18n-dict.ts`) with `en`, `ur` and `roman` values; components call `useT()` with an English fallback.

### Data model (Supabase, `public` schema)

`profiles` · `shop_businesses` · `shop_profile` · `shop_customers` · `shop_khata_tx` · `shop_suppliers` · `shop_supplier_tx` · `shop_products` · `shop_stock_moves` · `shop_sales` · `shop_sale_items` · `shop_purchases` · `shop_cashbook` · `shop_orders` · `shop_routine_items` · `shop_routine_log` · `shop_work_sessions` · `shop_push_subscriptions` · `shop_push_sent`

TypeScript types are generated into `src/lib/database.types.ts`.

## Project layout

```
src/
├─ proxy.ts                       session refresh + auth redirect
├─ app/
│  ├─ page.tsx                    public landing page
│  ├─ login/                      sign-in / sign-up / OTP / password reset (server actions)
│  ├─ (app)/                      authenticated shell: header + bottom nav (Work · Routine · Ledger · Orders · Shop)
│  │  ├─ work/  routine/  ledger/  orders/  cashbook/  settings/
│  │  └─ shop/  pos · stock · bills · expense · reports · import · settings
│  └─ print/{bill,purchase}/[id]  standalone printable documents
├─ components/                    Sheet, ItemLinePicker, CalcField, DateRangeFilter, BottomNav, Toaster …
└─ lib/
   ├─ supabase/                   browser / server / middleware clients
   ├─ khata/                      ledger + shop queries, bill sharing, receipt-image, order prefs, units
   ├─ routine/                    schedule engine, defaults, notifications, push subscribe, sound
   ├─ import/                     Digikhata PDF text extraction + parser + apply
   ├─ work/, auth/, i18n*.ts, format.ts, date*.ts
supabase/
├─ functions/routine-push/        Edge Function that sends background push
└─ email-templates/               confirm-signup e-mail template
public/                           manifest, service worker, icon, azan sound, pdf.js worker
reference/                        frozen single-file prototype (not built)
```

## Getting started

Prerequisites: Node.js 20+ and npm, and a [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/SanaAkram/MizanKhata.git
cd MizanKhata
npm install
```

Create `.env.local` (git-ignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<web-push public key>     # optional, enables push subscription
```

Then:

```bash
npm run dev            # http://localhost:3000  → redirected to /login
```

`postinstall` copies the pdf.js worker into `public/` (needed for the Digikhata import).

### Database

The app expects the `shop_*` tables above with row-level security policies (`owner_id = auth.uid()`), a `profiles` table with an `is_premium` flag, and a Storage bucket named `business-logos` for business logos. The SQL migrations are not stored in this repository — they were applied directly in Supabase — so to reproduce the schema on a new project, dump it from the existing one (`supabase db pull`) or recreate it from `src/lib/database.types.ts`. Auth settings: enable e-mail sign-in with confirmation, and paste `supabase/email-templates/confirm-signup.html` as the "Confirm signup" template (it shows the one-time code).

### Web push (optional)

1. Generate a VAPID key pair (any web-push tool); put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Keep the key pair itself in a git-ignored file such as `push-vapid.local.json`.
2. Deploy the Edge Function and set its secrets in Supabase → Edge Functions → `routine-push`:

   ```bash
   supabase functions deploy routine-push
   supabase secrets set CRON_SECRET=<random-string> \
                        VAPID_PUBLIC_JWK='<json>' VAPID_PRIVATE_JWK='<json>' \
                        PUSH_CONTACT='mailto:you@example.com'
   ```

3. Schedule it every minute with `pg_cron` + `pg_net`, sending the `x-cron-secret` header, for example:

   ```sql
   select cron.schedule('routine-push', '* * * * *', $$
     select net.http_post(
       url     := 'https://<project-ref>.supabase.co/functions/v1/routine-push',
       headers := jsonb_build_object('x-cron-secret', '<same CRON_SECRET>')
     );
   $$);
   ```

On iPhone, add the app to the Home Screen (iOS 16.4+) for background notifications.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Deploy to Vercel

1. Import the GitHub repo in Vercel (the Next.js preset is detected; `vercel.json` pins the `bom1` Mumbai region).
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for Production and Preview.
3. Every push to `main` deploys.

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Supabase (`@supabase/ssr`, `supabase-js`) · pdf.js (`pdfjs-dist`) · Web Push (VAPID) · Vercel
