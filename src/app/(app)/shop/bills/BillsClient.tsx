"use client";

import { toast } from "@/lib/toast";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import {
  deleteSale,
  updateSale,
  type Sale,
  type SaleItem,
} from "@/lib/khata/shop-db";
import type { Business } from "@/lib/khata/business";
import Sheet from "@/components/Sheet";
import CalcField from "@/components/CalcField";
import DateRangeFilter from "@/components/DateRangeFilter";
import { useT } from "@/lib/i18n";
import {
  ALL_TIME,
  inRange,
  isActive,
  rangeLabel,
  type DateRange,
} from "@/lib/date-range";
import { billText, shareBill, speakBill } from "@/lib/khata/bill-share";
import { BILL_CREDIT } from "@/lib/brand";

type Numbered = Sale & { no: number };
type Cust = { id: string; name: string; phone: string | null };
type Ktx = { customer_id: string; type: string; amount: number };

export default function BillsClient({
  businessId,
  sales,
  items,
  customers,
  khataTx,
  business,
  premium = false,
}: {
  businessId: string;
  sales: Sale[];
  items: SaleItem[];
  customers: Cust[];
  khataTx: Ktx[];
  business: Business | null;
  premium?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState<Numbered | null>(null);
  const [q, setQ] = useState("");
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [armDel, setArmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [edCustId, setEdCustId] = useState("");
  const [edDiscount, setEdDiscount] = useState("");
  const [edTax, setEdTax] = useState("");
  const [edNote, setEdNote] = useState("");
  const [edPaid, setEdPaid] = useState("");

  const brand = (premium && business?.logo_color) || "#2f4a34";
  const billLogo =
    premium && business?.logo_url ? business.logo_url : "/icon.svg";
  void businessId;

  const numbered = useMemo<Numbered[]>(() => {
    const asc = [...sales].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );
    return asc.map((s, i) => ({ ...s, no: i + 1 })).reverse();
  }, [sales]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = sales
    .filter((s) => (s.time ?? "").slice(0, 7) === thisMonth)
    .reduce((a, s) => a + Number(s.total || 0), 0);
  const monthLabel = new Date().toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  const ranged = numbered.filter((s) => inRange(s.time, range));
  const shown = ranged.filter(
    (s) =>
      !q ||
      `bill ${s.no} ${s.customer_name ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const rangeTotal = ranged.reduce((a, s) => a + Number(s.total || 0), 0);
  const rangeCredit = ranged.reduce(
    (a, s) => a + Number(s.credit_amount || 0),
    0,
  );
  const openItems = open ? items.filter((i) => i.sale_id === open.id) : [];
  const openCust = open?.customer_id
    ? customers.find((c) => c.id === open.customer_id)
    : null;
  const newBal = openCust
    ? khataTx
        .filter((t) => t.customer_id === openCust.id)
        .reduce((s, t) => s + (t.type === "credit" ? 1 : -1) * t.amount, 0)
    : 0;
  const prevBal = open ? newBal - Number(open.credit_amount || 0) : 0;

  const edSubtotal = openItems.reduce(
    (s, it) => s + Number(it.price || 0) * Number(it.qty || 0),
    0,
  );
  const edTotal =
    Math.round(
      (edSubtotal - (Number(edDiscount) || 0) + (Number(edTax) || 0)) * 100,
    ) / 100;
  const edPaidNum = Math.max(0, Math.min(Number(edPaid) || 0, edTotal));
  const edCredit = Math.round((edTotal - edPaidNum) * 100) / 100;

  function openBill(s: Numbered) {
    setArmDel(false);
    setEditing(false);
    setEdCustId(s.customer_id ?? "");
    setEdDiscount(Number(s.discount) ? String(Number(s.discount)) : "");
    setEdTax(Number(s.tax) ? String(Number(s.tax)) : "");
    setEdNote(s.note ?? "");
    setEdPaid(String(Number(s.paid_cash) || 0));
    setOpen(s);
  }

  function billMessage(s: Numbered) {
    const cust = s.customer_id
      ? customers.find((c) => c.id === s.customer_id)
      : null;
    const nb = cust
      ? khataTx
          .filter((t) => t.customer_id === cust.id)
          .reduce((sum, t) => sum + (t.type === "credit" ? 1 : -1) * t.amount, 0)
      : 0;
    const pb = nb - Number(s.credit_amount || 0);
    return billText(
      business?.name ?? "My Shop",
      s,
      s.no,
      items.filter((i) => i.sale_id === s.id),
      cust ? { prevBalance: pb, newBalance: nb } : undefined,
    );
  }

  async function removeBill(s: Numbered) {
    setBusy(true);
    try {
      await deleteSale(supabase, s.id);
      setOpen(null);
      setArmDel(false);
      toast("Bill deleted, stock restored.", "success");
      router.refresh();
    } catch {
      toast("Could not delete the bill.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!open) return;
    if (edCredit > 0 && !edCustId) {
      toast("Pick a customer for the unpaid amount, or mark it fully paid.", "error");
      return;
    }
    setBusy(true);
    try {
      const cust = edCustId ? customers.find((c) => c.id === edCustId) : null;
      await updateSale(supabase, open.id, {
        customerId: cust?.id ?? null,
        customerName: cust?.name ?? null,
        discount: Number(edDiscount) || 0,
        tax: Number(edTax) || 0,
        note: edNote.trim() || null,
        paidCash: edPaidNum,
        creditAmount: edCredit,
      });
      setOpen(null);
      setEditing(false);
      toast("Bill updated.", "success");
      router.refresh();
    } catch {
      toast("Could not update the bill.", "error");
    } finally {
      setBusy(false);
    }
  }

  function badge(s: Sale) {
    const credit = Number(s.credit_amount) || 0;
    const cash = Number(s.paid_cash) || 0;
    if (credit <= 0)
      return { text: t("bills.badge.cash", "Cash"), cls: "bg-ok/10 text-ok" };
    if (cash > 0)
      return {
        text: t("bills.badge.partial", "Partial · {amt} credit", {
          amt: fmtRs(credit),
        }),
        cls: "bg-gold/10 text-gold",
      };
    return {
      text: t("bills.badge.credit", "On credit"),
      cls: "bg-danger/10 text-danger",
    };
  }

  const inputCls =
    "rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-forest";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link href="/shop" className="text-sm text-muted">
          ‹ {t("nav.shop", "Shop")}
        </Link>
        <Link
          href="/shop/pos"
          className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-paper"
        >
          {t("bills.newBill", "+ New bill")}
        </Link>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {isActive(range)
            ? t("bills.salesFor", "Sales · {r}", { r: rangeLabel(range) })
            : t("bills.totalSaleFor", "Total sale for {m}", { m: monthLabel })}
        </p>
        <p className="numeric mt-1 text-2xl font-semibold text-forest">
          {fmtRs(isActive(range) ? rangeTotal : monthTotal)}
        </p>
        {isActive(range) ? (
          <p className="mt-0.5 text-[11px] text-muted">
            {ranged.length}{" "}
            {ranged.length === 1
              ? t("range.entry", "bill")
              : t("range.entries", "bills")}
            {rangeCredit > 0
              ? ` · ${fmtRs(rangeCredit)} ${t("bills.badge.credit", "on credit")}`
              : ""}
          </p>
        ) : null}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("bills.searchBills", "Search {n} bills", {
          n: numbered.length,
        })}
        className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-forest"
      />

      <DateRangeFilter onChange={setRange} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          {numbered.length === 0
            ? t("bills.noBills", "No bills yet.")
            : isActive(range)
              ? t("range.noneInRange", "Nothing in this date range.")
              : t("c.noMatches", "No matches.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((s) => {
            const b = badge(s);
            return (
              <li key={s.id}>
                <button
                  onClick={() => openBill(s)}
                  className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">
                      {t("bills.billNo", "Bill #{n}", { n: s.no })}
                    </span>
                    <span className="numeric text-sm font-semibold text-forest">
                      {fmtRs(Number(s.total))}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="min-w-0 truncate text-[11px] text-muted">
                      {fmtEntryDate(s.time)} ·{" "}
                      {s.customer_name ||
                        customers.find((c) => c.id === s.customer_id)?.name ||
                        t("bills.walkin", "Walk-in")}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${b.cls}`}
                    >
                      {b.text}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={open !== null}
        title={open ? t("bills.billNo", "Bill #{n}", { n: open.no }) : ""}
        onClose={() => setOpen(null)}
      >
        {open && editing ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              {t("c.customer", "Customer")}
              <select
                value={edCustId}
                onChange={(e) => setEdCustId(e.target.value)}
                className={inputCls}
              >
                <option value="">
                  {t("bills.walkinNoLedger", "Walk-in (no ledger)")}
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-between text-xs text-muted">
              <span>{t("bills.itemsSubtotal", "Items subtotal")}</span>
              <span className="numeric">{fmtRs(edSubtotal)}</span>
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              {t("pos.discount", "Discount")}
              <CalcField
                value={edDiscount}
                onChange={setEdDiscount}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              {t("bills.taxExtra", "Tax / extra")}
              <CalcField value={edTax} onChange={setEdTax} placeholder="0" />
            </label>

            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{t("bills.grandTotal", "Bill total")}</span>
              <span className="numeric" style={{ color: brand }}>
                {fmtRs(edTotal)}
              </span>
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              {t("bills.paidNow", "Paid")} ({t("c.cash", "cash")})
              <CalcField
                value={edPaid}
                onChange={setEdPaid}
                placeholder="0"
              />
            </label>
            <div className="flex justify-between text-xs">
              <span className="text-muted">
                {t("bills.goesOnCredit", "Goes on credit")}
              </span>
              <span
                className="numeric font-semibold"
                style={{ color: edCredit > 0 ? brand : undefined }}
              >
                {fmtRs(edCredit)}
              </span>
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              {t("c.note", "Note")}
              <textarea
                value={edNote}
                onChange={(e) => setEdNote(e.target.value)}
                rows={2}
                placeholder={t("c.optional", "Optional")}
                className={`${inputCls} resize-none`}
              />
            </label>

            <p className="text-[11px] text-muted">
              {t(
                "bills.itemsLocked",
                "Items can't be changed here — delete the bill and make a new one if the products are wrong.",
              )}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEditing(false)}
                disabled={busy}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted disabled:opacity-50"
              >
                {t("c.cancel", "Cancel")}
              </button>
              <button
                onClick={saveEdit}
                disabled={busy}
                className="rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
              >
                {busy ? t("c.saving", "Saving…") : t("c.saveChanges", "Save changes")}
              </button>
            </div>
          </div>
        ) : open ? (
          <div className="flex flex-col gap-2">
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={billLogo}
                alt=""
                className="mx-auto mb-1 h-12 w-auto object-contain"
              />
              <p className="text-sm font-semibold" style={{ color: brand }}>
                {business?.name ?? "My Shop"}
              </p>
              {business?.phone ? (
                <p className="text-[11px] text-muted">{business.phone}</p>
              ) : null}
              {business?.address ? (
                <p className="text-[11px] text-muted">{business.address}</p>
              ) : null}
            </div>

            <div className="flex items-start justify-between border-y border-line py-2 text-xs">
              <div className="min-w-0">
                <p className="font-semibold" style={{ color: brand }}>
                  {t("bills.billTo", "Bill to")}
                </p>
                <p className="truncate text-sm font-semibold text-ink">
                  {open.customer_name ||
                    openCust?.name ||
                    t("bills.walkinFull", "Walk-in / cash customer")}
                </p>
                {openCust?.phone ? (
                  <p className="text-muted">{openCust.phone}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-right text-muted">
                {fmtEntryDate(open.time)}
              </p>
            </div>

            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 pt-1 text-xs">
              <span className="font-semibold text-muted">
                {t("bills.item", "Item")}
              </span>
              <span className="text-right font-semibold text-muted">
                {t("bills.qtyRate", "Qty×Rate")}
              </span>
              <span className="text-right font-semibold text-muted">
                {t("bills.amount", "Amount")}
              </span>
              {openItems.map((it) => (
                <div key={it.id} className="contents">
                  <span className="text-ink">{it.name}</span>
                  <span className="numeric text-right text-muted">
                    {Math.round(Number(it.qty))}×{fmtRs(Number(it.price))}
                  </span>
                  <span className="numeric text-right">
                    {fmtRs(Number(it.price) * Number(it.qty))}
                  </span>
                </div>
              ))}
            </div>

            {Number(open.discount) > 0 ? (
              <div className="flex justify-between text-xs text-muted">
                <span>{t("pos.discount", "Discount")}</span>
                <span className="numeric">− {fmtRs(Number(open.discount))}</span>
              </div>
            ) : null}
            {Number(open.tax) > 0 ? (
              <div className="flex justify-between text-xs text-muted">
                <span>{t("bills.tax", "Tax")}</span>
                <span className="numeric">+ {fmtRs(Number(open.tax))}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{t("bills.grandTotal", "Bill total")}</span>
              <span className="numeric" style={{ color: brand }}>
                {fmtRs(Number(open.total))}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{t("bills.paidNow", "Paid")}</span>
              <span className="numeric">{fmtRs(Number(open.paid_cash))}</span>
            </div>
            {Number(open.credit_amount) > 0 ? (
              <div className="flex items-center justify-between text-xs font-semibold text-danger">
                <span>{t("bills.unpaidThis", "Remaining")}</span>
                <span className="numeric">
                  {fmtRs(Number(open.credit_amount))}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs font-semibold text-ok">
                <span>{t("bills.status", "Status")}</span>
                <span>{t("bills.paidInFull", "All paid")}</span>
              </div>
            )}

            <div
              className="rounded-lg border p-2 text-xs"
              style={{ borderColor: `${brand}33`, background: `${brand}0a` }}
            >
              {openCust ? (
                <>
                  <p
                    className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: brand }}
                  >
                    {t("bills.accountTitle", "Account")}
                  </p>
                  <div className="flex justify-between text-muted">
                    <span>{t("bills.prevBalance", "Old balance")}</span>
                    <span className="numeric">{fmtRs(prevBal)}</span>
                  </div>
                  {Number(open.credit_amount) > 0 ? (
                    <div className="flex justify-between text-muted">
                      <span>{t("bills.thisBillUnpaid", "This bill")}</span>
                      <span className="numeric">
                        + {fmtRs(Number(open.credit_amount))}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-semibold">
                    <span>
                      {t("bills.totalDueFrom", "{name} to pay", {
                        name: openCust.name,
                      })}
                    </span>
                    <span className="numeric" style={{ color: brand }}>
                      {fmtRs(newBal)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted">
                  {t(
                    "bills.walkinNote",
                    "Cash sale — not added to anyone's account. Use Edit to pick a customer.",
                  )}
                </p>
              )}
            </div>

            {open.note ? (
              <p className="whitespace-pre-line text-xs text-muted">
                {open.note}
              </p>
            ) : null}

            <p className="pt-1 text-center text-[10px] text-muted">
              {BILL_CREDIT}
            </p>

            <div className="mt-1 grid grid-cols-2 gap-2">
              <a
                href={`/print/bill/${open.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-line px-4 py-2.5 text-center text-sm font-semibold text-forest"
              >
                {t("bills.printPdf", "Print / PDF")}
              </a>
              <button
                onClick={() =>
                  void shareBill(billMessage(open), openCust?.phone ?? undefined)
                }
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-forest"
              >
                {t("bills.share", "Share")}
              </button>
              <button
                onClick={() => speakBill(billMessage(open))}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted"
              >
                {t("bills.readAloud", "Read aloud")}
              </button>
              <a
                href={`sms:${
                  openCust?.phone?.replace(/[^0-9+]/g, "") ?? ""
                }?body=${encodeURIComponent(billMessage(open))}`}
                className="rounded-xl border border-line px-4 py-2.5 text-center text-sm font-semibold text-muted"
              >
                {t("bills.sms", "SMS")}
              </a>
            </div>

            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                onClick={() => setEditing(true)}
                className="rounded-xl border border-forest/30 bg-forest/5 px-4 py-2.5 text-sm font-semibold text-forest"
              >
                {t("bills.editBill", "Edit bill")}
              </button>
              <button
                onClick={() => {
                  if (!armDel) {
                    setArmDel(true);
                    setTimeout(() => setArmDel(false), 3000);
                    return;
                  }
                  void removeBill(open);
                }}
                disabled={busy}
                className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-semibold text-danger disabled:opacity-50"
              >
                {armDel
                  ? t("bills.deleteBillArm", "Tap again to delete")
                  : t("bills.deleteBill", "Delete bill")}
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
