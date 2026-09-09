"use client";

import { toast } from "@/lib/toast";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { newId } from "@/lib/ids";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import { addCash, cashInHand, deleteCash, type Cash } from "@/lib/khata/db";
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

type PartyOpt = { id: string; name: string; kind: "customer" | "supplier" };

export default function CashbookClient({
  businessId,
  cash,
  parties,
}: {
  businessId: string;
  cash: Cash[];
  parties: PartyOpt[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<Cash | null>(null);
  const [tab, setTab] = useState<"all" | "cash" | "bank">("all");
  const [range, setRange] = useState<DateRange>(ALL_TIME);

  const cashBal = useMemo(
    () => cashInHand(cash.filter((c) => (c.method ?? "cash") === "cash")),
    [cash],
  );
  const bankBal = useMemo(
    () => cashInHand(cash.filter((c) => c.method === "bank")),
    [cash],
  );
  const rows = useMemo(
    () =>
      [...cash]
        .filter((c) => tab === "all" || (c.method ?? "cash") === tab)
        .filter((c) => inRange(c.date, range))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [cash, tab, range],
  );

  const periodIn = rows
    .filter((r) => r.type === "in")
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const periodOut = rows
    .filter((r) => r.type === "out")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  async function remove(row: Cash) {
    await deleteCash(supabase, row.id);
    setDetail(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Cash in hand
          </p>
          <p
            className={`numeric mt-1 text-2xl font-semibold ${
              cashBal < 0 ? "text-danger" : "text-ink"
            }`}
          >
            {fmtRs(cashBal)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Bank balance
          </p>
          <p
            className={`numeric mt-1 text-2xl font-semibold ${
              bankBal < 0 ? "text-danger" : "text-ink"
            }`}
          >
            {fmtRs(bankBal)}
          </p>
        </div>
      </section>

      <div className="flex gap-1 rounded-xl border border-line bg-card p-1">
        {(["all", "cash", "bank"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
              tab === t ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <DateRangeFilter onChange={setRange} />

      {isActive(range) ? (
        <div className="rounded-xl border border-line bg-card p-3 text-xs">
          <p className="font-semibold text-ink">
            {rangeLabel(range)} · {rows.length}{" "}
            {rows.length === 1
              ? t("range.entry", "entry")
              : t("range.entries", "entries")}
          </p>
          <div className="mt-1 flex justify-between text-ok">
            <span>{t("cash.in", "Cash in")}</span>
            <span className="numeric">+ {fmtRs(periodIn)}</span>
          </div>
          <div className="flex justify-between text-danger">
            <span>{t("cash.out", "Cash out")}</span>
            <span className="numeric">− {fmtRs(periodOut)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold text-ink">
            <span>{t("range.netForPeriod", "Net for period")}</span>
            <span className="numeric">{fmtRs(periodIn - periodOut)}</span>
          </div>
        </div>
      ) : null}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Entries
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            {isActive(range)
              ? t("range.noneInRange", "Nothing in this date range.")
              : "No cash entries yet — tap + to add one."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => setDetail(e)}
                  className="flex w-full items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">
                      {e.note || (e.type === "in" ? "Cash in" : "Cash out")}
                      {e.party_name ? (
                        <span className="text-muted"> — {e.party_name}</span>
                      ) : null}
                    </span>
                    <span className="text-[11px] text-muted">
                      {fmtEntryDate(e.date)}
                    </span>
                  </span>
                  <span
                    className={`numeric shrink-0 text-sm font-semibold ${
                      e.type === "in" ? "text-ok" : "text-danger"
                    }`}
                  >
                    {e.type === "in" ? "+" : "−"} {fmtRs(e.amount)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        onClick={() => setAdding(true)}
        aria-label="Add cash entry"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-forest text-2xl font-light text-paper shadow-lg active:scale-95 sm:right-[max(1rem,calc(50%-15rem+1rem))]"
      >
        +
      </button>

      <Sheet open={adding} title="Add cash entry" onClose={() => setAdding(false)}>
        <AddCashForm
          businessId={businessId}
          parties={parties}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          supabase={supabase}
        />
      </Sheet>

      <Sheet
        open={detail !== null}
        title={detail?.type === "in" ? "Cash in" : "Cash out"}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <div className="flex flex-col gap-3">
            <p
              className={`numeric text-2xl font-semibold ${
                detail.type === "in" ? "text-ok" : "text-danger"
              }`}
            >
              {detail.type === "in" ? "+ " : "− "}
              {fmtRs(detail.amount)}
            </p>
            <p className="text-sm text-muted">
              {detail.note || "—"}
              {detail.party_name ? ` · ${detail.party_name}` : ""}
            </p>
            <p className="text-xs text-muted">{fmtEntryDate(detail.date)}</p>
            <button
              onClick={() => remove(detail)}
              className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-semibold text-danger"
            >
              Delete entry
            </button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function AddCashForm({
  businessId,
  parties,
  onDone,
  supabase,
}: {
  businessId: string;
  parties: PartyOpt[];
  onDone: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [type, setType] = useState<"in" | "out">("in");
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [partyVal, setPartyVal] = useState("");
  const [busy, setBusy] = useState(false);

  const amt = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const OUT_CATS = [
    "purchase",
    "expense",
    "salary",
    "rent",
    "transport",
    "other",
  ];

  async function save() {
    if (amt <= 0) return;
    setBusy(true);
    try {
      const p = parties.find((x) => `${x.kind}:${x.id}` === partyVal);
      await addCash(supabase, businessId, {
        id: newId("cb_"),
        type,
        amount: amt,
        note: note.trim() || null,
        partyType: p ? p.kind : null,
        partyId: p ? p.id : null,
        partyName: p ? p.name : null,
        date: new Date().toISOString(),
        method,
        category: type === "out" ? category || "expense" : "income",
      });
      onDone();
    } catch {
      toast("Could not save the entry.", "error");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-xl border border-line p-1">
        {(["in", "out"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              type === t ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {t === "in" ? "Cash in" : "Cash out"}
          </button>
        ))}
      </div>
      <CalcField
        big
        autoFocus
        value={amount}
        onChange={setAmount}
        placeholder="Amount"
      />
      <div className="flex gap-2">
        <div className="flex flex-1 gap-1 rounded-xl border border-line p-1">
          {(["cash", "bank"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize ${
                method === m ? "bg-forest text-paper" : "text-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {type === "out" ? (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm capitalize outline-none focus:border-forest"
          >
            <option value="">category…</option>
            {OUT_CATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <select
        value={partyVal}
        onChange={(e) => setPartyVal(e.target.value)}
        className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
      >
        <option value="">No party — general</option>
        {parties.map((p) => (
          <option key={`${p.kind}:${p.id}`} value={`${p.kind}:${p.id}`}>
            {p.name} ({p.kind})
          </option>
        ))}
      </select>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (e.g. shop rent)"
        className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
      />
      <button
        onClick={save}
        disabled={amt <= 0 || busy}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
