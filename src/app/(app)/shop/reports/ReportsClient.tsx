"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fmtRs } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { Cash } from "@/lib/khata/db";
import {
  grossProfit,
  type Product,
  type Purchase,
  type Sale,
  type SaleItem,
} from "@/lib/khata/shop-db";
import { expenseCategories, expenseTotal, expenseLabel } from "@/lib/khata/expense";
import DateRangeFilter from "@/components/DateRangeFilter";
import MiniBars, { ShareBars, type BarPoint } from "@/components/MiniBars";
import {
  ALL_TIME,
  inRange,
  isActive,
  rangeLabel,
  type DateRange,
} from "@/lib/date-range";

type Props = {
  sales: Sale[];
  saleItems: SaleItem[];
  purchases: Purchase[];
  products: Product[];
  cash: Cash[];
};

export default function ReportsClient({
  sales,
  saleItems,
  purchases,
  products,
  cash,
}: Props) {
  const t = useT();
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [pnlView, setPnlView] = useState<"blocks" | "chart">("blocks");

  const saleTimeById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sales) m.set(s.id, s.time ?? "");
    return m;
  }, [sales]);

  const periodSales = useMemo(
    () => sales.filter((s) => inRange(s.time, range)),
    [sales, range],
  );
  const periodItems = useMemo(
    () =>
      saleItems.filter((it) =>
        inRange(saleTimeById.get(it.sale_id ?? "") || null, range),
      ),
    [saleItems, saleTimeById, range],
  );

  const salesTotal = periodSales.reduce((s, b) => s + Number(b.total || 0), 0);
  const gross = grossProfit(periodItems, purchases, products);
  const cogs = Math.max(0, gross <= 0 ? 0 : salesTotal - gross);
  const expenses = expenseTotal(cash, range);
  const net = gross - expenses;

  const expCats = useMemo(
    () => expenseCategories(cash, range),
    [cash, range],
  );

  const cashIn = cash
    .filter((c) => c.type === "in" && inRange(c.date, range))
    .reduce((s, c) => s + Number(c.amount || 0), 0);
  const cashOut = cash
    .filter((c) => c.type === "out" && inRange(c.date, range))
    .reduce((s, c) => s + Number(c.amount || 0), 0);

  // last 6 months income vs expense (trend, not range-bound)
  const months: BarPoint[] = useMemo(() => {
    const [y, m] = new Date().toISOString().slice(0, 7).split("-").map(Number);
    const out: BarPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const inM = (iso: string | null) => (iso ?? "").slice(0, 7) === key;
      const income = sales
        .filter((s) => inM(s.time))
        .reduce((a, s) => a + Number(s.total || 0), 0);
      const expense =
        purchases
          .filter((p) => inM(p.date))
          .reduce((a, p) => a + Number(p.qty || 0) * Number(p.price || 0), 0) +
        cash
          .filter(
            (c) =>
              c.type === "out" &&
              (c.category ?? "").toLowerCase() !== "payment" &&
              inM(c.date),
          )
          .reduce((a, c) => a + Number(c.amount || 0), 0);
      out.push({
        label: d.toLocaleDateString([], { month: "short" }),
        income,
        expense,
      });
    }
    return out;
  }, [sales, purchases, cash]);
  const hasChart = months.some((mo) => mo.income > 0 || mo.expense > 0);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/shop" className="text-sm text-muted">
        ‹ {t("nav.shop", "Shop")}
      </Link>

      <DateRangeFilter onChange={setRange} />
      <p className="-mt-1 text-[11px] text-muted">
        {isActive(range) ? rangeLabel(range) : t("rep.allTime", "All time")}
      </p>

      {/* Profit & Loss */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("rep.pnl", "Profit & loss")}
          </h2>
          <div className="flex gap-1 text-[11px] font-semibold">
            {(["blocks", "chart"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setPnlView(v)}
                className={`rounded-md px-2 py-1 ${
                  pnlView === v
                    ? "bg-forest text-paper"
                    : "border border-line text-muted"
                }`}
              >
                {v === "blocks"
                  ? t("rep.blocks", "Blocks")
                  : t("rep.chart", "Chart")}
              </button>
            ))}
          </div>
        </div>

        {pnlView === "blocks" ? (
          <div className="flex flex-col gap-1.5 text-sm">
            <PnlRow label={t("dash.sales", "Sales")} value={salesTotal} tone="ok" sign="+" />
            <PnlRow
              label={t("rep.cogs", "Cost of goods sold")}
              value={cogs}
              tone="danger"
              sign="−"
            />
            <PnlRow
              label={t("rep.grossProfit", "Gross profit")}
              value={gross}
              bold
            />
            <PnlRow
              label={t("dash.expenses", "Expenses")}
              value={expenses}
              tone="danger"
              sign="−"
            />
            <div className="mt-1 flex items-center justify-between border-t border-line pt-2 text-base font-semibold">
              <span>{t("rep.netProfit", "Net profit")}</span>
              <span
                className={`numeric ${net >= 0 ? "text-ok" : "text-danger"}`}
              >
                {fmtRs(net)}
              </span>
            </div>
          </div>
        ) : hasChart ? (
          <div>
            <MiniBars data={months} />
            <p className="mt-1 text-center text-[10px] text-muted">
              {t("rep.last6", "Last 6 months · sales vs money out")}
            </p>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            {t("rep.noChart", "Not enough data for a chart yet.")}
          </p>
        )}
      </section>

      {/* Cash flow (Cash Book report) */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("rep.cashFlow", "Cash flow")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-ok/30 bg-ok/10 p-3">
            <p className="text-[11px] font-semibold uppercase text-ok">
              {t("cash.in", "Cash in")}
            </p>
            <p className="numeric mt-0.5 text-lg font-semibold text-ok">
              {fmtRs(cashIn)}
            </p>
          </div>
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3">
            <p className="text-[11px] font-semibold uppercase text-danger">
              {t("cash.out", "Cash out")}
            </p>
            <p className="numeric mt-0.5 text-lg font-semibold text-danger">
              {fmtRs(cashOut)}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm font-semibold">
          <span>{t("range.netForPeriod", "Net for period")}</span>
          <span
            className={`numeric ${
              cashIn - cashOut >= 0 ? "text-ok" : "text-danger"
            }`}
          >
            {fmtRs(cashIn - cashOut)}
          </span>
        </div>
      </section>

      {/* Expenses by category */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
          <span>{t("rep.expenseBreakdown", "Expenses by category")}</span>
          <span className="numeric">{fmtRs(expenses)}</span>
        </h2>
        {expCats.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            {t("exp.none", "No expenses yet.")}
          </p>
        ) : (
          <ShareBars
            items={expCats.map((c) => ({
              name: expenseLabel(c.category),
              amount: c.total,
            }))}
            tone="danger"
          />
        )}
        <Link
          href="/shop/expense"
          className="mt-3 inline-block text-xs font-semibold text-forest underline underline-offset-2"
        >
          {t("rep.openExpenses", "Open Expenses")}
        </Link>
      </section>
    </div>
  );
}

function PnlRow({
  label,
  value,
  tone,
  sign,
  bold,
}: {
  label: string;
  value: number;
  tone?: "ok" | "danger";
  sign?: "+" | "−";
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? "border-t border-line pt-1.5 font-semibold" : ""
      }`}
    >
      <span className={bold ? "text-ink" : "text-muted"}>{label}</span>
      <span
        className={`numeric ${
          tone === "ok"
            ? "text-ok"
            : tone === "danger"
              ? "text-danger"
              : "text-ink"
        }`}
      >
        {sign ? `${sign} ` : ""}
        {fmtRs(value)}
      </span>
    </div>
  );
}
