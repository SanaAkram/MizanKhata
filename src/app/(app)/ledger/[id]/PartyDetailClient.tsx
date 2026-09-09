"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { newId } from "@/lib/ids";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import {
  addCash,
  addPartyTx,
  deletePartyTx,
  updatePartyTx,
  withRunningBalance,
  type PartyKind,
  type TxType,
} from "@/lib/khata/db";
import Sheet from "@/components/Sheet";

type Row = {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  date: string;
  ref?: string | null;
  bill_id?: string | null;
};

type Props = {
  kind: PartyKind;
  party: { id: string; name: string; phone: string | null };
  txs: Row[];
};

function waLink(phone: string, text: string) {
  return (
    "https://wa.me/" +
    phone.replace(/[^0-9]/g, "") +
    "?text=" +
    encodeURIComponent(text)
  );
}

export default function PartyDetailClient({ kind, party, txs }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const isCust = kind === "customer";

  const [addType, setAddType] = useState<TxType | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);

  const rows = useMemo(() => {
    const asc = [...txs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return withRunningBalance(asc).reverse();
  }, [txs]);

  const balance = rows.length ? rows[0].running : 0;

  const balLine = isCust
    ? balance > 0
      ? `Owes you ${fmtRs(balance)}`
      : balance < 0
        ? `Advance ${fmtRs(-balance)}`
        : "Settled"
    : balance > 0
      ? `You owe ${fmtRs(balance)}`
      : "Settled";

  const waText =
    balance > 0
      ? `Assalam-o-Alaikum ${party.name}, ${
          isCust
            ? `aap ka humare taraf Rs ${Math.round(balance)} baqaya hai. Meharbani farma k jald ada karein.`
            : `hum par aap ka Rs ${Math.round(balance)} baqaya hai.`
        } Shukriya.`
      : `Assalam-o-Alaikum ${party.name}, hisaab clear hai. Shukriya!`;

  async function saveAdd(type: TxType, amount: number, note: string, date: string) {
    const id = newId("tx_");
    await addPartyTx(supabase, kind, party.id, { id, type, amount, note, date });
    if (type === "payment") {
      await addCash(supabase, {
        id: newId("cb_"),
        type: isCust ? "in" : "out",
        amount,
        note: isCust ? "Payment received" : "Payment made",
        partyType: kind,
        partyId: party.id,
        partyName: party.name,
        date,
      });
    }
    setAddType(null);
    router.refresh();
  }

  async function saveEdit(row: Row, amount: number, note: string, date: string) {
    await updatePartyTx(supabase, kind, row.id, { amount, note, date });
    setEditRow(null);
    router.refresh();
  }

  async function remove(row: Row) {
    await deletePartyTx(supabase, kind, row.id);
    setEditRow(null);
    router.refresh();
  }

  const creditLabel = isCust ? "Credit given" : "Goods on credit";
  const paymentLabel = isCust ? "Payment received" : "Payment made";

  return (
    <div className="flex flex-col gap-4">
      <Link href="/ledger" className="text-sm text-muted">
        ‹ Ledger
      </Link>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h1 className="numeric text-xl font-semibold text-ink">{party.name}</h1>
        <p
          className={`mt-0.5 text-sm font-semibold ${
            balance > 0
              ? isCust
                ? "text-ok"
                : "text-danger"
              : "text-muted"
          }`}
        >
          {balLine}
        </p>
        {party.phone ? (
          <a
            href={waLink(party.phone, waText)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg border border-ok/40 bg-ok/10 px-3 py-1.5 text-xs font-semibold text-ok"
          >
            WhatsApp reminder
          </a>
        ) : null}
      </section>

      <div className="flex gap-2">
        <button
          onClick={() => setAddType("credit")}
          className="flex-1 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper active:scale-[0.99]"
        >
          {creditLabel}
        </button>
        <button
          onClick={() => setAddType("payment")}
          className="flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-forest active:scale-[0.99]"
        >
          {paymentLabel}
        </button>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          History
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            No entries yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => {
              const credit = r.type === "credit";
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setEditRow(r)}
                    className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {credit ? creditLabel : paymentLabel}
                        </p>
                        {r.note ? (
                          <p className="truncate text-xs text-muted">
                            {r.note}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-muted">
                          {fmtEntryDate(r.date)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`numeric text-sm font-semibold ${
                            credit ? "text-danger" : "text-ok"
                          }`}
                        >
                          {credit ? "+" : "−"} {fmtRs(r.amount)}
                        </p>
                        <p className="numeric text-[11px] text-muted">
                          {fmtRs(r.running)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Sheet
        open={addType !== null}
        title={addType === "credit" ? creditLabel : paymentLabel}
        onClose={() => setAddType(null)}
      >
        {addType ? (
          <EntryForm
            submitLabel="Save"
            onSubmit={(amt, note, date) => saveAdd(addType, amt, note, date)}
          />
        ) : null}
      </Sheet>

      <Sheet
        open={editRow !== null}
        title="Edit entry"
        onClose={() => setEditRow(null)}
      >
        {editRow ? (
          <EntryForm
            submitLabel="Save changes"
            initial={{
              amount: String(editRow.amount),
              note: editRow.note ?? "",
              date: editRow.date,
            }}
            onSubmit={(amt, note, date) => saveEdit(editRow, amt, note, date)}
            onDelete={() => remove(editRow)}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function EntryForm({
  submitLabel,
  initial,
  onSubmit,
  onDelete,
}: {
  submitLabel: string;
  initial?: { amount: string; note: string; date: string };
  onSubmit: (amount: number, note: string, dateIso: string) => void;
  onDelete?: () => void;
}) {
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [date, setDate] = useState(
    (initial?.date ?? new Date().toISOString()).slice(0, 10),
  );
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  const amt = Math.round((parseFloat(amount) || 0) * 100) / 100;

  return (
    <div className="flex flex-col gap-3">
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        inputMode="decimal"
        autoFocus
        className="numeric rounded-xl border border-line bg-paper px-4 py-3 text-2xl font-semibold outline-none focus:border-forest"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
      />
      <button
        onClick={() => {
          if (amt <= 0 || busy) return;
          setBusy(true);
          onSubmit(amt, note.trim(), new Date(date + "T12:00:00").toISOString());
        }}
        disabled={amt <= 0 || busy}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? "Saving…" : submitLabel}
      </button>
      {onDelete ? (
        <button
          onClick={() => {
            if (!armed) {
              setArmed(true);
              setTimeout(() => setArmed(false), 3000);
              return;
            }
            onDelete();
          }}
          className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-semibold text-danger"
        >
          {armed ? "Tap again to delete" : "Delete entry"}
        </button>
      ) : null}
    </div>
  );
}
