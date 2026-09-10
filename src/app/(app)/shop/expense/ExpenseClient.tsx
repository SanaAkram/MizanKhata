"use client";

import { toast } from "@/lib/toast";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { newId } from "@/lib/ids";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import { addCash, type Cash } from "@/lib/khata/db";
import {
  EXPENSE_CATEGORIES,
  expenseCategories,
  expenseLabel,
  expenseTotal,
} from "@/lib/khata/expense";
import Sheet from "@/components/Sheet";
import CalcField from "@/components/CalcField";
import DateRangeFilter from "@/components/DateRangeFilter";
import { useT } from "@/lib/i18n";
import {
  ALL_TIME,
  isActive,
  rangeLabel,
  type DateRange,
} from "@/lib/date-range";

export default function ExpenseClient({
  businessId,
  cash,
}: {
  businessId: string;
  cash: Cash[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [range, setRange] = useState<DateRange>(ALL_TIME);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = useMemo(
    () =>
      cash
        .filter(
          (c) =>
            c.type === "out" &&
            (c.category ?? "").toLowerCase() !== "payment" &&
            (c.category ?? "").toLowerCase() !== "opening" &&
            (c.date ?? "").slice(0, 7) === thisMonth,
        )
        .reduce((s, c) => s + Number(c.amount || 0), 0),
    [cash, thisMonth],
  );
  const monthLabel = new Date().toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  const cats = useMemo(() => expenseCategories(cash, range), [cash, range]);
  const rangeTotal = useMemo(() => expenseTotal(cash, range), [cash, range]);
  const shown = cats.filter(
    (c) => !q || expenseLabel(c.category).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/shop" className="text-sm text-muted">
          ‹ {t("nav.shop", "Shop")}
        </Link>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {isActive(range)
            ? t("exp.spentFor", "Spent · {r}", { r: rangeLabel(range) })
            : t("exp.totalFor", "Total spent in {m}", { m: monthLabel })}
        </p>
        <p className="numeric mt-1 text-2xl font-semibold text-danger">
          {fmtRs(isActive(range) ? rangeTotal : monthTotal)}
        </p>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("exp.search", "Search categories")}
        className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-forest"
      />

      <DateRangeFilter onChange={setRange} />

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("exp.byCategory", "By category")}
        </h2>
        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            {cats.length === 0
              ? t("exp.none", "No expenses yet — tap + to add one.")
              : isActive(range)
                ? t("range.noneInRange", "Nothing in this date range.")
                : t("c.noMatches", "No matches.")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((c) => (
              <li key={c.category}>
                <Link
                  href={`/shop/expense/${encodeURIComponent(c.category)}`}
                  className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">
                      {expenseLabel(c.category)}
                    </span>
                    <span className="text-[11px] text-muted">
                      {c.count}{" "}
                      {c.count === 1
                        ? t("exp.entry", "entry")
                        : t("exp.entries", "entries")}
                      {c.lastDate ? ` · ${fmtEntryDate(c.lastDate)}` : ""}
                    </span>
                  </span>
                  <span className="numeric shrink-0 text-sm font-semibold text-danger">
                    {fmtRs(c.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        onClick={() => setAdding(true)}
        aria-label={t("exp.add", "Add expense")}
        className="sticky bottom-4 z-30 mt-auto self-end h-14 w-14 rounded-full bg-forest text-2xl font-light text-paper shadow-lg active:scale-95"
      >
        +
      </button>

      <Sheet
        open={adding}
        title={t("exp.add", "Add expense")}
        onClose={() => setAdding(false)}
      >
        <AddExpenseForm
          businessId={businessId}
          knownCategories={cats.map((c) => c.category)}
          supabase={supabase}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      </Sheet>
    </div>
  );
}

function AddExpenseForm({
  businessId,
  knownCategories,
  supabase,
  onDone,
}: {
  businessId: string;
  knownCategories: string[];
  supabase: ReturnType<typeof createClient>;
  onDone: () => void;
}) {
  const t = useT();
  const options = useMemo(() => {
    const set = new Set<string>([...knownCategories, ...EXPENSE_CATEGORIES]);
    return [...set];
  }, [knownCategories]);

  const [category, setCategory] = useState(options[0] ?? "general");
  const [customCat, setCustomCat] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  });
  const [busy, setBusy] = useState(false);

  const amt = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const cat = (category === "__new" ? customCat : category).trim().toLowerCase();
  const cls =
    "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";

  async function save() {
    if (amt <= 0 || !cat || busy) return;
    setBusy(true);
    try {
      await addCash(supabase, businessId, {
        id: newId("cb_"),
        type: "out",
        amount: amt,
        note: note.trim() || null,
        date: new Date(`${date}T12:00:00`).toISOString(),
        method,
        category: cat,
      });
      onDone();
    } catch {
      toast("Could not save the expense.", "error");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <CalcField
        big
        autoFocus
        value={amount}
        onChange={setAmount}
        placeholder={t("c.amount", "Amount")}
      />

      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        {t("exp.category", "Category")}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={cls}
        >
          {options.map((c) => (
            <option key={c} value={c}>
              {expenseLabel(c)}
            </option>
          ))}
          <option value="__new">{t("exp.newCategory", "+ New category")}</option>
        </select>
      </label>
      {category === "__new" ? (
        <input
          value={customCat}
          onChange={(e) => setCustomCat(e.target.value)}
          placeholder={t("exp.categoryName", "Category name")}
          className={cls}
          autoFocus
        />
      ) : null}

      <div className="flex gap-1 rounded-xl border border-line p-1">
        {(["cash", "bank"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              method === m ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {t(`c.${m}`, m)}
          </button>
        ))}
      </div>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={cls}
      />

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("exp.notePh", "Note (e.g. October shop rent)")}
        className={cls}
      />

      <button
        onClick={save}
        disabled={amt <= 0 || !cat || busy}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? t("c.saving", "Saving…") : t("c.save", "Save")}
      </button>
    </div>
  );
}
