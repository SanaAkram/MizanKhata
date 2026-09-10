"use client";

import { toast } from "@/lib/toast";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { newId } from "@/lib/ids";
import { fmtRs } from "@/lib/format";
import {
  addPartyTx,
  buildParties,
  createParty,
  type Customer,
  type KhataTx,
  type PartyKind,
  type Supplier,
  type SupplierTx,
} from "@/lib/khata/db";
import { seedKhata } from "@/lib/khata/seed";
import { useT } from "@/lib/i18n";
import Sheet from "@/components/Sheet";
import CalcField from "@/components/CalcField";

type Props = {
  businessId: string;
  customers: Customer[];
  suppliers: Supplier[];
  khataTx: KhataTx[];
  supplierTx: SupplierTx[];
  cashHand: number;
  bankBal: number;
};

type Filter = "all" | "customer" | "supplier";

export default function LedgerClient({
  businessId,
  customers,
  suppliers,
  khataTx,
  supplierTx,
  cashHand,
  bankBal,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const parties = useMemo(
    () => buildParties(customers, suppliers, khataTx, supplierTx),
    [customers, suppliers, khataTx, supplierTx],
  );

  const willGet = parties
    .filter((p) => p.kind === "customer" && p.balance > 0)
    .reduce((s, p) => s + p.balance, 0);
  const willGive = parties
    .filter((p) => p.kind === "supplier" && p.balance > 0)
    .reduce((s, p) => s + p.balance, 0);
  const liquid = cashHand + bankBal;
  // Net worth on the books: what customers owe − what you owe suppliers + cash/bank.
  const net = willGet - willGive + liquid;

  const shown = parties.filter((p) => {
    if (filter !== "all" && p.kind !== filter) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const empty = customers.length === 0 && suppliers.length === 0;

  async function loadSample() {
    setBusy(true);
    try {
      await seedKhata(supabase, businessId);
      router.refresh();
    } catch {
      toast("Could not load the sample data.", "error");
      setBusy(false);
    }
  }

  if (empty) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        <h2 className="numeric text-xl font-semibold text-forest">
          {t("ledger.empty", "Your ledger is empty")}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          {t(
            "ledger.emptyHint",
            "Load parties, suppliers and stock to try it out, or add parties yourself with the + button.",
          )}
        </p>
        <button
          onClick={loadSample}
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-forest px-4 py-3.5 text-sm font-semibold text-paper active:scale-[0.99] disabled:opacity-60"
        >
          {busy
            ? t("c.loading", "Loading…")
            : t("ledger.loadSample", "Load Digikhata sample data")}
        </button>
        <button
          onClick={() => setAdding(true)}
          className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted"
        >
          {t("ledger.addManual", "Add a party manually")}
        </button>
        <AddPartySheet
          open={adding}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          supabase={supabase}
          businessId={businessId}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("ledger.youllGet", "You'll get")}
          </p>
          <p className="numeric mt-1 text-xl font-semibold text-ok">
            {fmtRs(willGet)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("ledger.youllGive", "You'll give")}
          </p>
          <p className="numeric mt-1 text-xl font-semibold text-danger">
            {fmtRs(willGive)}
          </p>
        </div>
      </section>

      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("ledger.netPosition", "Net position")}
        </p>
        <div className="mt-2 flex flex-col gap-1 text-xs text-muted">
          <div className="flex justify-between">
            <span>{t("ledger.customersOweYou", "Customers owe you")}</span>
            <span className="numeric text-ok">+ {fmtRs(willGet)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("ledger.youOweSuppliers", "You owe suppliers")}</span>
            <span className="numeric text-danger">− {fmtRs(willGive)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("ledger.cashBankInHand", "Cash & bank in hand")}</span>
            <span
              className={`numeric ${liquid < 0 ? "text-danger" : "text-ok"}`}
            >
              {liquid < 0 ? "− " : "+ "}
              {fmtRs(Math.abs(liquid))}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <span className="text-sm font-semibold text-ink">
            {t("ledger.net", "Net")}
          </span>
          <span
            className={`numeric text-lg font-semibold ${
              net >= 0 ? "text-ok" : "text-danger"
            }`}
          >
            {fmtRs(net)}
          </span>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-line bg-card p-1">
        {(["all", "customer", "supplier"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              filter === f ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {f === "all"
              ? t("ledger.all", "All")
              : f === "customer"
                ? t("ledger.customers", "Customers")
                : t("ledger.suppliers", "Suppliers")}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("ledger.searchParties", "Search {n} parties", {
          n: parties.length,
        })}
        className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-forest"
      />

      <ul className="flex flex-col gap-2">
        {shown.map((p) => (
          <li key={`${p.kind}:${p.id}`}>
            <Link
              href={`/ledger/${p.id}?kind=${p.kind}`}
              className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {p.name}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {p.kind === "customer"
                    ? t("ledger.customers", "Customer").replace(/s$/, "")
                    : t("ledger.suppliers", "Supplier").replace(/s$/, "")}
                </span>
              </span>
              <span
                className={`numeric shrink-0 text-sm font-semibold ${
                  p.balance > 0
                    ? p.kind === "customer"
                      ? "text-ok"
                      : "text-danger"
                    : "text-muted"
                }`}
              >
                {p.balance > 0 ? fmtRs(p.balance) : t("ledger.settled", "Settled")}
              </span>
            </Link>
          </li>
        ))}
        {shown.length === 0 ? (
          <li className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            {t("c.noMatches", "No matches.")}
          </li>
        ) : null}
      </ul>

      <button
        onClick={() => setAdding(true)}
        className="sticky bottom-4 z-30 mt-auto self-end h-14 w-14 rounded-full bg-forest text-2xl font-light text-paper shadow-lg active:scale-95"
        aria-label={t("ledger.addParty", "Add party")}
      >
        +
      </button>

      <AddPartySheet
        open={adding}
        onClose={() => setAdding(false)}
        onDone={() => {
          setAdding(false);
          router.refresh();
        }}
        supabase={supabase}
          businessId={businessId}
        />
    </div>
  );
}

function AddPartySheet({
  open,
  onClose,
  onDone,
  supabase,
  businessId,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  supabase: ReturnType<typeof createClient>;
  businessId: string;
}) {
  const t = useT();
  const [kind, setKind] = useState<PartyKind>("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [opening, setOpening] = useState("");
  const [saving, setSaving] = useState(false);

  const contactsSupported =
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    typeof window !== "undefined" &&
    "ContactsManager" in window;

  async function pickContact() {
    try {
      const nav = navigator as unknown as {
        contacts: {
          select: (
            props: string[],
            opts: { multiple?: boolean },
          ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
        };
      };
      const [c] = await nav.contacts.select(["name", "tel"], {
        multiple: false,
      });
      if (c?.name?.[0]) setName(c.name[0]);
      if (c?.tel?.[0]) setPhone(String(c.tel[0]).replace(/\s+/g, ""));
    } catch {
      /* cancelled / unsupported */
    }
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const id = newId(kind === "customer" ? "c_" : "s_");
      await createParty(supabase, businessId, kind, {
        id,
        name: name.trim(),
        phone: phone.trim() || null,
      });
      const amt = Math.round((parseFloat(opening) || 0) * 100) / 100;
      if (amt > 0) {
        await addPartyTx(supabase, businessId, kind, id, {
          id: newId("tx_"),
          type: "credit",
          amount: amt,
          note: "Opening balance",
          date: new Date().toISOString(),
        });
      }
      setName("");
      setPhone("");
      setOpening("");
      onDone();
    } catch {
      toast("Could not add the party.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} title={t("ledger.addParty", "Add party")} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-1 rounded-xl border border-line p-1">
          {(["customer", "supplier"] as PartyKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                kind === k ? "bg-forest text-paper" : "text-muted"
              }`}
            >
              {k === "customer"
                ? t("c.customer", "Customer")
                : t("c.supplier", "Supplier")}
            </button>
          ))}
        </div>
        {contactsSupported ? (
          <button
            onClick={pickContact}
            className="rounded-lg border border-line px-3 py-2.5 text-left text-sm font-semibold text-forest"
          >
            {t("ledger.importContacts", "Import from contacts")}
          </button>
        ) : null}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("ledger.name", "Name")}
          className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("ledger.phoneOpt", "Phone (optional)")}
          inputMode="tel"
          className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
        <CalcField
          value={opening}
          onChange={setOpening}
          placeholder={
            kind === "customer"
              ? t("ledger.openingCust", "Opening balance they owe (optional)")
              : t("ledger.openingSupp", "Opening balance you owe (optional)")
          }
        />
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {saving ? t("c.saving", "Saving…") : t("ledger.addParty", "Add party")}
        </button>
      </div>
    </Sheet>
  );
}
