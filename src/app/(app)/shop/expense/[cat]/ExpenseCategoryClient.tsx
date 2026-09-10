"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import { deleteCash, type Cash } from "@/lib/khata/db";
import { expenseLabel } from "@/lib/khata/expense";
import { useEntryLayout } from "@/lib/entry-layout";
import Sheet from "@/components/Sheet";
import DateRangeFilter from "@/components/DateRangeFilter";
import { useT } from "@/lib/i18n";
import {
  ALL_TIME,
  inRange,
  isActive,
  rangeLabel,
  type DateRange,
} from "@/lib/date-range";

export default function ExpenseCategoryClient({
  category,
  rows,
}: {
  category: string;
  rows: Cash[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();
  const layout = useEntryLayout();
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [detail, setDetail] = useState<Cash | null>(null);
  const [busy, setBusy] = useState(false);

  const shown = useMemo(
    () =>
      [...rows]
        .filter((r) => inRange(r.date, range))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [rows, range],
  );
  const total = shown.reduce((s, r) => s + Number(r.amount || 0), 0);
  const lifetime = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  async function remove(row: Cash) {
    setBusy(true);
    try {
      await deleteCash(supabase, row.id);
      setDetail(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <Link href="/shop/expense" className="text-sm text-muted">
        ‹ {t("title./shop/expense", "Expenses")}
      </Link>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h1 className="text-lg font-semibold text-ink">
          {expenseLabel(category)}
        </h1>
        <p className="numeric mt-1 text-2xl font-semibold text-danger">
          {fmtRs(isActive(range) ? total : lifetime)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted">
          {isActive(range)
            ? `${rangeLabel(range)} · ${shown.length}`
            : t("exp.allTime", "All time")}
        </p>
      </section>

      <DateRangeFilter onChange={setRange} />

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {t("exp.entries", "Entries")}
      </h2>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {t("range.noneInRange", "Nothing in this date range.")}
        </p>
      ) : layout === "columns" ? (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] border-b border-line bg-card text-[10px] font-semibold uppercase tracking-wide">
            <span className="px-3 py-2 text-muted">
              {t("exp.entries", "Entries")}
            </span>
            <span className="bg-danger/10 px-2 py-2 text-right text-danger">
              {t("cash.out", "Cash out")}
            </span>
          </div>
          {shown.map((r) => (
            <button
              key={r.id}
              onClick={() => setDetail(r)}
              className="grid w-full grid-cols-[minmax(0,1fr)_6rem] border-b border-line text-left last:border-b-0 active:bg-line/30"
            >
              <span className="min-w-0 px-3 py-2.5">
                <span className="block text-[11px] text-muted">
                  {fmtEntryDate(r.date)}
                </span>
                <span className="mt-0.5 block break-words text-xs text-ink">
                  {r.note || expenseLabel(category)}
                </span>
                <span className="numeric mt-1 inline-block rounded bg-line/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                  {t(`c.${r.method ?? "cash"}`, r.method ?? "cash")}
                </span>
              </span>
              <span className="numeric break-all bg-danger/10 px-2 py-2.5 text-right text-sm font-semibold leading-tight text-danger">
                {fmtRs(r.amount)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setDetail(r)}
                className="flex w-full items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">
                    {r.note || expenseLabel(category)}
                  </span>
                  <span className="text-[11px] text-muted">
                    {fmtEntryDate(r.date)} ·{" "}
                    {t(`c.${r.method ?? "cash"}`, r.method ?? "cash")}
                  </span>
                </span>
                <span className="numeric shrink-0 text-sm font-semibold text-danger">
                  − {fmtRs(r.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={detail !== null}
        title={expenseLabel(category)}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <div className="flex flex-col gap-3">
            <p className="numeric text-2xl font-semibold text-danger">
              − {fmtRs(detail.amount)}
            </p>
            <p className="text-sm text-muted">{detail.note || "—"}</p>
            <p className="text-xs text-muted">
              {fmtEntryDate(detail.date)} ·{" "}
              {t(`c.${detail.method ?? "cash"}`, detail.method ?? "cash")}
            </p>
            <button
              onClick={() => void remove(detail)}
              disabled={busy}
              className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-semibold text-danger disabled:opacity-50"
            >
              {t("cash.deleteEntry", "Delete entry")}
            </button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
