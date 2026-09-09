"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import DateRangeFilter from "@/components/DateRangeFilter";
import { useT } from "@/lib/i18n";
import {
  ALL_TIME,
  inRange,
  isActive,
  rangeLabel,
  type DateRange,
} from "@/lib/date-range";

export type ReportLine = {
  id: string;
  name: string;
  unit: string;
  qty: number;
  rate: number | null;
  date: string;
  note: string | null;
};

export default function StockReportClient({
  kind,
  lines,
}: {
  kind: "in" | "out";
  lines: ReportLine[];
}) {
  const t = useT();
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const shown = lines.filter((l) => inRange(l.date, range));
  const totalQty = shown.reduce((s, l) => s + l.qty, 0);
  const totalAmt = shown.reduce((s, l) => s + (l.rate ?? 0) * l.qty, 0);

  return (
    <div className="flex flex-col gap-3">
      <Link href="/shop/stock" className="text-sm text-muted">
        ‹ Stock
      </Link>
      <h1 className="numeric text-lg font-semibold text-forest">
        Stock {kind === "in" ? "IN" : "OUT"} report
      </h1>
      <div className="flex gap-3">
        <Link
          href="/shop/stock/reports?type=in"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            kind === "in"
              ? "bg-forest text-paper"
              : "border border-line text-muted"
          }`}
        >
          IN
        </Link>
        <Link
          href="/shop/stock/reports?type=out"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            kind === "out"
              ? "bg-forest text-paper"
              : "border border-line text-muted"
          }`}
        >
          OUT
        </Link>
      </div>

      <DateRangeFilter onChange={setRange} />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted">Total qty</p>
          <p className="numeric mt-1 text-lg font-semibold text-ink">
            {Math.round(totalQty).toLocaleString("en-US")}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted">
            Total value
          </p>
          <p className="numeric mt-1 text-lg font-semibold text-ink">
            {fmtRs(totalAmt)}
          </p>
        </div>
      </section>

      {isActive(range) ? (
        <p className="text-xs text-muted">
          {rangeLabel(range)} · {shown.length}{" "}
          {shown.length === 1
            ? t("range.entry", "entry")
            : t("range.entries", "entries")}
        </p>
      ) : null}

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {lines.length === 0
            ? "Nothing here yet."
            : t("range.noneInRange", "Nothing in this date range.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate text-ink">{l.name}</span>
                <span className="text-[11px] text-muted">
                  {fmtEntryDate(l.date)}
                  {l.rate != null ? ` · ${fmtRs(l.rate)}` : ""}
                </span>
              </span>
              <span
                className={`numeric shrink-0 font-semibold ${
                  kind === "in" ? "text-ok" : "text-danger"
                }`}
              >
                {kind === "in" ? "+" : "−"}
                {Math.round(l.qty).toLocaleString("en-US")} {l.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
