"use client";

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
import Sheet from "@/components/Sheet";

type Props = {
  customers: Customer[];
  suppliers: Supplier[];
  khataTx: KhataTx[];
  supplierTx: SupplierTx[];
};

type Filter = "all" | "customer" | "supplier";

export default function LedgerClient({
  customers,
  suppliers,
  khataTx,
  supplierTx,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
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

  const shown = parties.filter((p) => {
    if (filter !== "all" && p.kind !== filter) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const empty = customers.length === 0 && suppliers.length === 0;

  async function loadSample() {
    setBusy(true);
    try {
      await seedKhata(supabase);
      router.refresh();
    } catch {
      alert("Could not load the sample data.");
      setBusy(false);
    }
  }

  if (empty) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        <h2 className="numeric text-xl font-semibold text-forest">
          Your ledger is empty
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          Load Mubeen&apos;s parties, suppliers and stock from the Digikhata
          export to try it out, or add parties yourself with the + button.
        </p>
        <button
          onClick={loadSample}
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-forest px-4 py-3.5 text-sm font-semibold text-paper active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Loading…" : "Load Digikhata sample data"}
        </button>
        <button
          onClick={() => setAdding(true)}
          className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted"
        >
          Add a party manually
        </button>
        <AddPartySheet
          open={adding}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          supabase={supabase}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            You&apos;ll get
          </p>
          <p className="numeric mt-1 text-xl font-semibold text-ok">
            {fmtRs(willGet)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            You&apos;ll give
          </p>
          <p className="numeric mt-1 text-xl font-semibold text-danger">
            {fmtRs(willGive)}
          </p>
        </div>
      </section>

      <div className="flex gap-1 rounded-xl border border-line bg-card p-1">
        {(["all", "customer", "supplier"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
              filter === f ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {f === "all" ? "All" : f + "s"}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${parties.length} parties`}
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
                  {p.kind}
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
                {p.balance > 0 ? fmtRs(p.balance) : "Settled"}
              </span>
            </Link>
          </li>
        ))}
        {shown.length === 0 ? (
          <li className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            No matches.
          </li>
        ) : null}
      </ul>

      <button
        onClick={() => setAdding(true)}
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-forest text-2xl font-light text-paper shadow-lg active:scale-95 sm:right-[max(1rem,calc(50%-15rem+1rem))]"
        aria-label="Add party"
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
      />
    </div>
  );
}

function AddPartySheet({
  open,
  onClose,
  onDone,
  supabase,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [kind, setKind] = useState<PartyKind>("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [opening, setOpening] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const id = newId(kind === "customer" ? "c_" : "s_");
      await createParty(supabase, kind, {
        id,
        name: name.trim(),
        phone: phone.trim() || null,
      });
      const amt = Math.round((parseFloat(opening) || 0) * 100) / 100;
      if (amt > 0) {
        await addPartyTx(supabase, kind, id, {
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
      alert("Could not add the party.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} title="Add party" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-1 rounded-xl border border-line p-1">
          {(["customer", "supplier"] as PartyKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
                kind === k ? "bg-forest text-paper" : "text-muted"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          inputMode="tel"
          className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
        <input
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
          placeholder={
            kind === "customer"
              ? "Opening balance they owe (optional)"
              : "Opening balance you owe (optional)"
          }
          inputMode="decimal"
          className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add party"}
        </button>
      </div>
    </Sheet>
  );
}
