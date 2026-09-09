# Ridwan — Shop / Day App

A mobile web app combining: a work timer, a daily routine checklist (prayer/work/health),
a POS-style Sales flow, Stock/inventory management, and a Khata-style credit ledger
(Customers, Suppliers, Cash Book) inspired by Digikhata.

## Files
- `app.html` — the whole app: single-file HTML/CSS/JS. This is the canonical source.
- `supabase-edge-function-index.ts` — the same app wrapped as a Deno Edge Function
  (just embeds app.html as a string and serves it), used to get a real `https://` URL
  since the app needs network access to Supabase and won't work opened as a local file
  (Safari/Chrome block cross-origin fetch from `file://` origins).

## Backend: Supabase
- Project: "SanaAkram's Project", project ref `osdwcrqglgukjfwfhrwt`,
  org `tnbfnvmcxugxcilbbhxz` ("SanaAkram's Org"), region us-west-1.
- **This project already has unrelated apps/tables in it** (candidates, jobs, personal_vocab,
  dictionary, inb_pilot_*, etc.) — several of THOSE tables have RLS disabled. Not touched by
  this project, but worth knowing before running broad migrations against this project.
- This app's tables (all prefixed `shop_`, all with RLS enabled, all keyed by
  `owner_id = auth.uid()`):
  `shop_customers`, `shop_suppliers`, `shop_products`, `shop_purchases`, `shop_sales`,
  `shop_sale_items`, `shop_khata_tx`, `shop_supplier_tx`, `shop_cashbook`,
  `shop_work_sessions` (created, not yet wired up), `shop_routine_state` (created, not yet wired up).
- IDs are `text` primary keys (not `uuid`) — the app generates its own short IDs
  (`Date.now().toString(36) + random suffix`), so don't change PK types without also
  changing the app's ID generation.
- Auth: Supabase email/password auth. The app has a full sign-in/sign-up screen gating
  everything else.
- Credentials embedded directly in `app.html`/the edge function (this is normal/safe —
  it's the anon/publishable key, not a secret key; RLS is what actually protects data):
  - `SUPABASE_URL = "https://osdwcrqglgukjfwfhrwt.supabase.co"`
  - anon key is inline near the top of the `<script>` block.

## What's wired to Supabase vs. local-only
**Synced to Supabase** (multi-device, persists in the real DB):
products, stock, customers, suppliers, Khata ledger, Supplier ledger, Cash Book,
sales/bills (incl. bill photos via a `photo_data_url` column on `shop_sales`).

**Still local-only (localStorage on that one device)** — a deliberate scope cut, not
an oversight: the in-progress cart while building a bill, the running work timer
("work-running"), and the work-session history / daily routine checklist
(`shop_work_sessions` / `shop_routine_state` tables exist but the app still reads/writes
these two via localStorage, not Supabase). Migrating them is straightforward — same
pattern as everything else in `storeGet`/`storeSet` — just wasn't done yet.

## Known open items
1. **Edge Function deploy is stuck**: the `Supabase:deploy_edge_function` tool call
   kept returning "No approval received" with no visible approval prompt on the user's
   side, across multiple retries — never actually resolved. The `supabase-edge-function-index.ts`
   file was handed to the user to paste manually into the Supabase dashboard
   (Edge Functions → new function → name it `shop-app` → paste → **turn off "Enforce JWT
   verification"** since it needs to be a public page → deploy). Unconfirmed whether they've
   completed this step.
2. Restock flow doesn't yet offer a Cash/Credit/Partial payment split against a *supplier*
   (Sales checkout has this; Stock → Restock does not) — was discussed as a natural next step.
3. No per-transaction Edit/Delete or WhatsApp/SMS share on individual Khata/Supplier ledger
   entries (Digikhata has this via its "Entry Detail" screen) — only whole-history viewing.
4. `shop_work_sessions` / `shop_routine_state` tables exist unused (see above).
5. Demo data auto-seeds on first login if the account has zero customers/suppliers/products —
   see `seedDemoData()` near the bottom of the script. This was pulled from the user's own
   Digikhata screenshots (real party names/balances) for testing purposes, not fabricated.

## Design system (if extending the UI)
CSS custom properties at the top of `<style>`: warm paper/forest palette (`--forest`,
`--paper`, `--bg`, `--gold`, `--danger`), 'Source Serif 4' for headings/numbers,
'IBM Plex Sans' for body. Bottom-tab nav (Work/Routine/Sales/Stock/Ledger) + a
floating-action-button pattern for "create new X" flows, and a bottom-sheet modal
pattern (`#sheetLayer`) used for every form/detail view.
