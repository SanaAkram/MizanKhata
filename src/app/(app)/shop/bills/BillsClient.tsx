"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import type { Sale, SaleItem } from "@/lib/khata/shop-db";
import Sheet from "@/components/Sheet";

type Numbered = Sale & { no: number };

export default function BillsClient({
  sales,
  items,
}: {
  sales: Sale[];
  items: SaleItem[];
}) {
  const [open, setOpen] = useState<Numbered | null>(null);

  const numbered = useMemo<Numbered[]>(() => {
    const asc = [...sales].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );
    const withNo = asc.map((s, i) => ({ ...s, no: i + 1 }));
    return withNo.reverse();
  }, [sales]);

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
      <Link href="/shop" className="text-sm text-muted">
        ‹ Shop
      </Link>

      {numbered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No bills yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {numbered.map((s) => {
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
            <p className="text-xs text-muted">
              {fmtEntryDate(open.time)}
              {open.customer_name ? ` · ${open.customer_name}` : ""}
            </p>
            <ul className="flex flex-col gap-1 border-y border-line py-2">
              {openItems.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-ink">
                    {Math.round(Number(it.qty))} × {it.name}
                  </span>
                  <span className="numeric text-muted">
                    {fmtRs(Number(it.price) * Number(it.qty))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Total</span>
              <span className="numeric">{fmtRs(Number(open.total))}</span>
            </div>
            {Number(open.credit_amount) > 0 ? (
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Paid cash {fmtRs(Number(open.paid_cash))}</span>
                <span>On credit {fmtRs(Number(open.credit_amount))}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
