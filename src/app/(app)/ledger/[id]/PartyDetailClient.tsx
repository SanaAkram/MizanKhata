"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { newId } from "@/lib/ids";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import { useEntryLayout } from "@/lib/entry-layout";
import LayoutToggle from "@/components/LayoutToggle";
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
import { useT } from "@/lib/i18n";
import Sheet from "@/components/Sheet";
import CalcField from "@/components/CalcField";
import DateRangeFilter from "@/components/DateRangeFilter";
import {
  ALL_TIME,
  inRange,
  isActive,
  rangeLabel,
  type DateRange,
} from "@/lib/date-range";
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
  businessId: string;
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
  businessId,
  kind,
  party,
  products,
  txs,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();
  const isCust = kind === "customer";

  const [q, setQ] = useState("");
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [addType, setAddType] = useState<TxType | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [menu, setMenu] = useState(false);
  const [armDel, setArmDel] = useState(false);
  const layout = useEntryLayout();

  const rows = useMemo(() => {
    const asc = [...txs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return withRunningBalance(asc).reverse();
  }, [txs]);

  const balance = rows.length ? rows[0].running : 0;
  const life = partyLifetime(txs);
  // Money coming IN to my account = green; money going OUT = red.
  // Customer +balance = they owe me (money in). Supplier +balance = I owe them (money out).
  const moneyIn = isCust ? balance > 0 : balance < 0;
  const balTone =
    balance === 0 ? "text-muted" : moneyIn ? "text-ok" : "text-danger";

  const ranged = rows.filter((r) => inRange(r.date, range));
  const shown = ranged.filter(
    (r) => !q || (r.note ?? "").toLowerCase().includes(q.toLowerCase()),
  );
  const periodLife = partyLifetime(ranged);

  // Digikhata model: "You gave" = a credit entry (balance goes up), "You got"
  // = a payment (balance goes down). Same for customer and supplier.
  const gaveTxt = t("party.youGave", "You gave");
  const gotTxt = t("party.youGot", "You got");
  const creditLabel = gaveTxt;
  const paymentLabel = gotTxt;
  const gaveTotal = life.credit;
  const gotTotal = life.payment;
  const periodGave = periodLife.credit;
  const periodGot = periodLife.payment;

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
    await addPartyTx(supabase, businessId, kind, party.id, {
      id,
      type,
      amount,
      note,
      date: dateIso,
    });
    if (type === "payment") {
      await addCash(supabase, businessId, {
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
          ‹ {t("title./ledger", "Ledger")}
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
              {gaveTxt}
            </p>
            <p className="numeric text-sm font-semibold text-ink">
              {fmtRs(gaveTotal)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted">
              {gotTxt}
            </p>
            <p className="numeric text-sm font-semibold text-ink">
              {fmtRs(gotTotal)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted">
              {t("party.balance", "Balance")}
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
        placeholder={t("party.searchEntries", "Search {n} entries", {
          n: rows.length,
        })}
        className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-forest"
      />

      <DateRangeFilter onChange={setRange} />

      {isActive(range) ? (
        <div className="rounded-xl border border-line bg-card p-3 text-xs">
          <p className="font-semibold text-ink">
            {rangeLabel(range)} · {ranged.length}{" "}
            {ranged.length === 1
              ? t("range.entry", "entry")
              : t("range.entries", "entries")}
          </p>
          <div className="mt-1 flex justify-between text-muted">
            <span>{gaveTxt}</span>
            <span className="numeric">{fmtRs(periodGave)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>{gotTxt}</span>
            <span className="numeric">{fmtRs(periodGot)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold text-ink">
            <span>{t("range.netForPeriod", "Net for period")}</span>
            <span className="numeric">
              {fmtRs(periodLife.credit - periodLife.payment)}
            </span>
          </div>
        </div>
      ) : null}

      <LayoutToggle className="justify-end" />

      <section>
        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            {rows.length === 0
              ? t("party.noEntries", "No entries yet.")
              : isActive(range)
                ? t("range.noneInRange", "Nothing in this date range.")
                : t("c.noMatches", "No matches.")}
          </p>
        ) : layout === "columns" ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] border-b border-line bg-card text-[10px] font-semibold uppercase tracking-wide">
              <span className="px-3 py-2 text-muted">
                {t("party.entries", "Entries")}
              </span>
              <span className="bg-danger/10 px-2 py-2 text-right text-danger">
                {gaveTxt}
              </span>
              <span className="bg-ok/10 px-2 py-2 text-right text-ok">
                {gotTxt}
              </span>
            </div>
            {shown.map((r) => {
              const credit = r.type === "credit";
              return (
                <button
                  key={r.id}
                  onClick={() => setDetail(r)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] border-b border-line text-left last:border-b-0 active:bg-line/30"
                >
                  <span className="min-w-0 px-3 py-2.5">
                    <span className="block text-[11px] text-muted">
                      {fmtEntryDate(r.date)}
                    </span>
                    {r.note ? (
                      <span className="mt-0.5 block break-words whitespace-pre-line text-xs text-ink">
                        {r.note}
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-xs text-muted">
                        {credit ? creditLabel : paymentLabel}
                      </span>
                    )}
                    <span className="numeric mt-1 inline-block rounded bg-line/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                      {t("party.balance", "bal")} {fmtRs(Math.abs(r.running))}
                    </span>
                  </span>
                  <span className="numeric break-all bg-danger/10 px-2 py-2.5 text-right text-sm font-semibold leading-tight text-danger">
                    {credit ? fmtRs(r.amount) : ""}
                  </span>
                  <span className="numeric break-all bg-ok/10 px-2 py-2.5 text-right text-sm font-semibold leading-tight text-ok">
                    {credit ? "" : fmtRs(r.amount)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((r) => {
              const credit = r.type === "credit";
              const tone = credit ? "text-danger" : "text-ok";
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
                          {fmtEntryDate(r.date)} ·{" "}
                          <span className={tone}>
                            {credit ? creditLabel : paymentLabel}
                          </span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`numeric text-sm font-semibold ${tone}`}>
                          {fmtRs(r.amount)}
                        </p>
                        <p className="numeric text-[11px] text-muted">
                          {t("party.balance", "bal")} {fmtRs(Math.abs(r.running))}
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
            rateFrom={isCust ? "sale" : "purchase"}
            submitLabel={t("c.save", "Save")}
            onSubmit={(a, n, d, m) => saveAdd(addType, a, n, d, m)}
          />
        ) : null}
      </Sheet>

      {/* entry detail (read) */}
      <Sheet
        open={detail !== null}
        title={t("party.entry", "Entry")}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <div className="flex flex-col gap-3">
            <p
              className={`numeric text-2xl font-semibold ${
                detail.type === "credit" ? "text-danger" : "text-ok"
              }`}
            >
              {fmtRs(detail.amount)}
            </p>
            <p className="text-xs text-muted">
              {detail.type === "credit" ? creditLabel : paymentLabel} ·{" "}
              {fmtEntryDate(detail.date)}
              {detail.bill_id ? ` · ${t("party.fromBill", "from a bill")}` : ""}
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
                {t("c.edit", "Edit")}
              </button>
              <button
                onClick={() => void removeRow(detail)}
                className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger"
              >
                {t("c.delete", "Delete")}
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
                {t("party.shareWa", "Share on WhatsApp")}
              </a>
            ) : null}

            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs text-muted">
                {t("layout.default", "Default view for lists")}
              </span>
              <LayoutToggle showLabel={false} />
            </div>
          </div>
        ) : null}
      </Sheet>

      {/* edit entry */}
      <Sheet
        open={editRow !== null}
        title={t("c.edit", "Edit entry")}
        onClose={() => setEditRow(null)}
      >
        {editRow ? (
          <EntryForm
            products={products}
            showMethod={false}
            submitLabel={t("c.saveChanges", "Save changes")}
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
          {armDel
            ? t("party.deletePartyArm", "Tap again to delete this party")
            : t("party.deleteParty", "Delete party")}
        </button>
        <p className="mt-2 text-center text-xs text-muted">
          {t("party.deletePartyHint", "Deletes the party and all its entries.")}
        </p>
      </Sheet>
    </div>
  );
}

function EntryForm({
  products,
  showMethod,
  submitLabel,
  rateFrom = "sale",
  initial,
  onSubmit,
}: {
  products: Product[];
  showMethod: boolean;
  submitLabel: string;
  rateFrom?: "sale" | "purchase";
  initial?: { amount: string; note: string; date: string };
  onSubmit: (
    amount: number,
    note: string,
    dateIso: string,
    method: "cash" | "bank",
  ) => void;
}) {
  const t = useT();
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
      <CalcField
        big
        autoFocus
        value={amount}
        onChange={setAmount}
        placeholder={t("c.amount", "Amount")}
      />

      <button
        onClick={() => setPicker(true)}
        className="rounded-lg border border-line px-3 py-2.5 text-left text-sm font-semibold text-forest"
      >
        {t("party.addItem", "+ Add item from stock")}
      </button>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("c.notePh", "Details / comments")}
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
        placeholder={t("party.billNoOpt", "Bill no. (optional)")}
        className={cls}
      />

      {showMethod ? (
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
        {busy ? t("c.saving", "Saving…") : submitLabel}
      </button>

      <ItemLinePicker
        open={picker}
        products={products}
        rateFrom={rateFrom}
        onClose={() => setPicker(false)}
        onDone={addLines}
      />
    </div>
  );
}
