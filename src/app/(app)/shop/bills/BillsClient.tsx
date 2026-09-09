"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import type { Sale, SaleItem } from "@/lib/khata/shop-db";
import type { ShopProfile } from "@/lib/khata/profile";
import Sheet from "@/components/Sheet";

type Numbered = Sale & { no: number };

export default function BillsClient({
  sales,
  items,
  profile,
}: {
  sales: Sale[];
  items: SaleItem[];
  profile: ShopProfile | null;
}) {
  const [open, setOpen] = useState<Numbered | null>(null);
  const [q, setQ] = useState("");

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

  const shown = numbered.filter(
    (s) =>
      !q ||
      `bill ${s.no} ${s.customer_name ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const openItems = open ? items.filter((i) => i.sale_id === open.id) : [];

  function badge(s: Sale) {
    const credit = Number(s.credit_amount) || 0;
    const cash = Number(s.paid_cash) || 0;
    if (credit <= 0) return { text: "Cash", cls: "bg-ok/10 text-ok" };
    if (cash > 0)
      return {
        text: `Partial · ${fmtRs(credit)} credit`,
        cls: "bg-gold/10 text-gold",
      };
    return { text: "On credit", cls: "bg-danger/10 text-danger" };
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link href="/shop" className="text-sm text-muted">
          ‹ Shop
        </Link>
        <Link
          href="/shop/pos"
          className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-paper"
        >
          + New bill
        </Link>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Total sale for {monthLabel}
        </p>
        <p className="numeric mt-1 text-2xl font-semibold text-forest">
          {fmtRs(monthTotal)}
        </p>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${numbered.length} bills`}
        className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-forest"
      />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          {numbered.length === 0 ? "No bills yet." : "No matches."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((s) => {
            const b = badge(s);
            return (
              <li key={s.id}>
                <button
                  onClick={() => setOpen(s)}
                  className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">
                      Bill #{s.no}
                    </span>
                    <span className="numeric text-sm font-semibold text-forest">
                      {fmtRs(Number(s.total))}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-[11px] text-muted">
                      {fmtEntryDate(s.time)}
                      {s.customer_name ? ` · ${s.customer_name}` : ""}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${b.cls}`}
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
        title={open ? `Bill #${open.no}` : ""}
        onClose={() => setOpen(null)}
      >
        {open ? (
          <div className="flex flex-col gap-2">
            <div className="text-center">
              <p className="text-sm font-semibold text-ink">
                {profile?.shop_name ?? "My Shop"}
              </p>
              {profile?.phone ? (
                <p className="text-[11px] text-muted">{profile.phone}</p>
              ) : null}
              {profile?.address ? (
                <p className="text-[11px] text-muted">{profile.address}</p>
              ) : null}
            </div>
            <p className="text-center text-xs text-muted">
              {fmtEntryDate(open.time)}
              {open.customer_name ? ` · ${open.customer_name}` : ""}
            </p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-y border-line py-2 text-xs">
              <span className="font-semibold text-muted">Item</span>
              <span className="text-right font-semibold text-muted">Qty×Rate</span>
              <span className="text-right font-semibold text-muted">Amount</span>
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
                <span>Discount</span>
                <span className="numeric">− {fmtRs(Number(open.discount))}</span>
              </div>
            ) : null}
            {Number(open.tax) > 0 ? (
              <div className="flex justify-between text-xs text-muted">
                <span>Tax</span>
                <span className="numeric">+ {fmtRs(Number(open.tax))}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Grand total</span>
              <span className="numeric">{fmtRs(Number(open.total))}</span>
            </div>
            {Number(open.credit_amount) > 0 ? (
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Paid {fmtRs(Number(open.paid_cash))}</span>
                <span>On credit {fmtRs(Number(open.credit_amount))}</span>
              </div>
            ) : null}
            {open.note ? (
              <p className="text-xs text-muted">{open.note}</p>
            ) : null}
            <a
              href={`/print/bill/${open.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 rounded-xl border border-line px-4 py-2.5 text-center text-sm font-semibold text-forest"
            >
              Print / PDF
            </a>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
