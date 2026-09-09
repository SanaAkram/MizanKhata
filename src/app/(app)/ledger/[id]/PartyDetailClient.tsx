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
  deleteParty,
  deletePartyTx,
  partyLifetime,
  updatePartyTx,
  withRunningBalance,
  type PartyKind,
  type TxType,
} from "@/lib/khata/db";
import type { Product } from "@/lib/khata/shop-db";
import Sheet from "@/components/Sheet";
import ItemLinePicker, {
  linesToText,
  linesTotal,
  type ItemLine,
} from "@/components/ItemLinePicker";

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
  products: Product[];
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

export default function PartyDetailClient({
  kind,
  party,
  products,
  txs,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const isCust = kind === "customer";

  const [q, setQ] = useState("");
  const [addType, setAddType] = useState<TxType | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [menu, setMenu] = useState(false);
  const [armDel, setArmDel] = useState(false);

  const rows = useMemo(() => {
    const asc = [...txs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return withRunningBalance(asc).reverse();
  }, [txs]);

  const balance = rows.length ? rows[0].running : 0;
  const life = partyLifetime(txs);
  // Digikhata colour convention: money you'll GET (customer owes) = red;
  // money you'll GIVE (you owe a supplier) = green.
  const balTone = balance > 0 ? (isCust ? "text-danger" : "text-ok") : "text-muted";

  const shown = rows.filter(
    (r) => !q || (r.note ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const creditLabel = isCust ? "You gave (credit)" : "Purchase (on credit)";
  const paymentLabel = isCust ? "You got (payment)" : "Payment made";

  const waText =
    balance > 0
      ? `Assalam-o-Alaikum ${party.name}, ${
          isCust
            ? `aap ka humare taraf Rs ${Math.round(balance)} baqaya hai. Meharbani farma k jald ada karein.`
            : `hum par aap ka Rs ${Math.round(balance)} baqaya hai.`
        } Shukriya.`
      : `Assalam-o-Alaikum ${party.name}, hisaab clear hai. Shukriya!`;

  async function saveAdd(
    type: TxType,
    amount: number,
    note: string,
    dateIso: string,
    method: "cash" | "bank",
  ) {
    const id = newId("tx_");
    await addPartyTx(supabase, kind, party.id, {
      id,
      type,
      amount,
      note,
      date: dateIso,
    });
    if (type === "payment") {
      await addCash(supabase, {
        id: newId("cb_"),
        type: isCust ? "in" : "out",
        amount,
        note: isCust ? "Payment received" : "Payment made",
        partyType: kind,
        partyId: party.id,
        partyName: party.name,
        date: dateIso,
        method,
        category: "payment",
      });
    }
    setAddType(null);
    router.refresh();
  }

  async function saveEdit(
    row: Row,
    amount: number,
    note: string,
    dateIso: string,
  ) {
    await updatePartyTx(supabase, kind, row.id, {
      amount,
      note,
      date: dateIso,
    });
    setEditRow(null);
    setDetail(null);
    router.refresh();
  }

  async function removeRow(row: Row) {
    await deletePartyTx(supabase, kind, row.id);
    setEditRow(null);
    setDetail(null);
    router.refresh();
  }

  async function removeParty() {
    await deleteParty(supabase, kind, party.id);
    router.push("/ledger");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/ledger" className="text-sm text-muted">
          ‹ Ledger
        </Link>
        <button
          onClick={() => setMenu(true)}
          aria-label="More"
          className="rounded-lg px-2 py-1 text-lg leading-none text-muted"
        >
          ⋮
        </button>
      </div>

      {/* 3-column lifetime header */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h1 className="numeric text-xl font-semibold text-ink">{party.name}</h1>
        {party.phone ? (
          <a
            href={waLink(party.phone, waText)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-semibold text-ok underline underline-offset-2"
          >
            WhatsApp {party.phone}
          </a>
        ) : null}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted">
              You gave
            </p>
            <p className="numeric text-sm font-semibold text-ink">
              {fmtRs(life.credit)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted">
              You got
            </p>
            <p className="numeric text-sm font-semibold text-ink">
              {fmtRs(life.payment)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted">
              Balance
            </p>
            <p className={`numeric text-sm font-semibold ${balTone}`}>
              {fmtRs(Math.abs(balance))}
            </p>
          </div>
        </div>
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

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${rows.length} entries`}
        className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-forest"
      />

      <section>
        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            {rows.length === 0 ? "No entries yet." : "No matches."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((r) => {
              const credit = r.type === "credit";
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setDetail(r)}
                    className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {r.note ? (
                          <p className="whitespace-pre-line text-xs text-ink">
                            {r.note}
                          </p>
                        ) : (
                          <p className="text-xs text-muted">
                            {credit ? creditLabel : paymentLabel}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted">
                          {fmtEntryDate(r.date)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`numeric text-sm font-semibold ${
                            credit ? "text-forest" : "text-ok"
                          }`}
                        >
                          {fmtRs(r.amount)}
                        </p>
                        <p className="numeric text-[11px] text-muted">
                          bal {fmtRs(Math.abs(r.running))}
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

      {/* add entry */}
      <Sheet
        open={addType !== null}
        title={addType === "credit" ? creditLabel : paymentLabel}
        onClose={() => setAddType(null)}
      >
        {addType ? (
          <EntryForm
            products={products}
            showMethod={addType === "payment"}
            submitLabel="Save"
            onSubmit={(a, n, d, m) => saveAdd(addType, a, n, d, m)}
          />
        ) : null}
      </Sheet>

      {/* entry detail (read) */}
      <Sheet
        open={detail !== null}
        title="Entry"
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <div className="flex flex-col gap-3">
            <p className="numeric text-2xl font-semibold text-ink">
              {fmtRs(detail.amount)}
            </p>
            <p className="text-xs text-muted">
              {detail.type === "credit" ? creditLabel : paymentLabel} ·{" "}
              {fmtEntryDate(detail.date)}
              {detail.bill_id ? " · from a bill" : ""}
            </p>
            {detail.note ? (
              <p className="whitespace-pre-line rounded-lg border border-line bg-paper p-3 text-sm text-ink">
                {detail.note}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setEditRow(detail);
                  setDetail(null);
                }}
                className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper"
              >
                Edit
              </button>
              <button
                onClick={() => void removeRow(detail)}
                className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger"
              >
                Delete
              </button>
            </div>
            {party.phone ? (
              <a
                href={waLink(
                  party.phone,
                  `${party.name}: ${fmtRs(detail.amount)} (${
                    detail.type === "credit" ? creditLabel : paymentLabel
                  }) — ${new Date(detail.date).toLocaleDateString()}. Balance Rs ${Math.round(Math.abs(balance))}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-ok/40 bg-ok/10 px-4 py-2.5 text-center text-sm font-semibold text-ok"
              >
                Share on WhatsApp
              </a>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      {/* edit entry */}
      <Sheet
        open={editRow !== null}
        title="Edit entry"
        onClose={() => setEditRow(null)}
      >
        {editRow ? (
          <EntryForm
            products={products}
            showMethod={false}
            submitLabel="Save changes"
            initial={{
              amount: String(editRow.amount),
              note: editRow.note ?? "",
              date: editRow.date,
            }}
            onSubmit={(a, n, d) => saveEdit(editRow, a, n, d)}
          />
        ) : null}
      </Sheet>

      {/* party menu */}
      <Sheet open={menu} title={party.name} onClose={() => setMenu(false)}>
        <button
          onClick={() => {
            if (!armDel) {
              setArmDel(true);
              setTimeout(() => setArmDel(false), 3000);
              return;
            }
            void removeParty();
          }}
          className="w-full rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger"
        >
          {armDel ? "Tap again to delete this party" : "Delete party"}
        </button>
        <p className="mt-2 text-center text-xs text-muted">
          Deletes the party and all its entries.
        </p>
      </Sheet>
    </div>
  );
}

function EntryForm({
  products,
  showMethod,
  submitLabel,
  initial,
  onSubmit,
}: {
  products: Product[];
  showMethod: boolean;
  submitLabel: string;
  initial?: { amount: string; note: string; date: string };
  onSubmit: (
    amount: number,
    note: string,
    dateIso: string,
    method: "cash" | "bank",
  ) => void;
}) {
  const start = initial?.date ? new Date(initial.date) : new Date();
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [date, setDate] = useState(
    `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
      start.getDate(),
    ).padStart(2, "0")}`,
  );
  const [time, setTime] = useState(
    `${String(start.getHours()).padStart(2, "0")}:${String(
      start.getMinutes(),
    ).padStart(2, "0")}`,
  );
  const [ref, setRef] = useState("");
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const amt = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const cls =
    "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";

  function addLines(lines: ItemLine[]) {
    if (lines.length === 0) return;
    const text = linesToText(lines);
    setNote((n) => (n ? n + "\n" + text : text));
    setAmount(String(Math.round((amt + linesTotal(lines)) * 100) / 100));
    setPicker(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          inputMode="decimal"
          autoFocus
          className="numeric flex-1 rounded-xl border border-line bg-paper px-4 py-3 text-2xl font-semibold outline-none focus:border-forest"
        />
        {amount ? (
          <button
            onClick={() => setAmount("")}
            className="rounded-lg border border-line px-3 py-2 text-sm text-muted"
          >
            ✕
          </button>
        ) : null}
      </div>

      <button
        onClick={() => setPicker(true)}
        className="rounded-lg border border-line px-3 py-2.5 text-left text-sm font-semibold text-forest"
      >
        + Add item from stock
      </button>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Details / comments"
        rows={3}
        className={`${cls} resize-none`}
      />

      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${cls} w-1/2`}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={`${cls} w-1/2`}
        />
      </div>

      <input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="Bill no. (optional)"
        className={cls}
      />

      {showMethod ? (
        <div className="flex gap-1 rounded-xl border border-line p-1">
          {(["cash", "bank"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
                method === m ? "bg-forest text-paper" : "text-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      ) : null}

      <button
        onClick={() => {
          if (amt <= 0 || busy) return;
          setBusy(true);
          const iso = new Date(`${date}T${time || "12:00"}:00`).toISOString();
          const full = ref ? `${note}${note ? "\n" : ""}Bill: ${ref}` : note;
          onSubmit(amt, full.trim(), iso, method);
        }}
        disabled={amt <= 0 || busy}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? "Saving…" : submitLabel}
      </button>

      <ItemLinePicker
        open={picker}
        products={products}
        rateFrom="sale"
        onClose={() => setPicker(false)}
        onDone={addLines}
      />
    </div>
  );
}
