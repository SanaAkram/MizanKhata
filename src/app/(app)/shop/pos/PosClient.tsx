"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtRs } from "@/lib/format";
import {
  completeSale,
  type CartLine,
  type Product,
} from "@/lib/khata/shop-db";
import Sheet from "@/components/Sheet";

type Props = {
  products: Product[];
  customers: { id: string; name: string }[];
};

export default function PosClient({ products, customers }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [q, setQ] = useState("");
  const [checkout, setCheckout] = useState(false);

  const total = cart.reduce((s, l) => s + l.price * l.qty, 0);

  function qtyInCart(id: string) {
    return cart.find((l) => l.productId === id)?.qty ?? 0;
  }

  function add(p: Product) {
    const inCart = qtyInCart(p.id);
    if (inCart + 1 > Number(p.stock)) return;
    setCart((c) => {
      const found = c.find((l) => l.productId === p.id);
      if (found)
        return c.map((l) =>
          l.productId === p.id ? { ...l, qty: l.qty + 1 } : l,
        );
      return [
        ...c,
        {
          productId: p.id,
          name: p.name,
          unit: p.unit,
          price: Number(p.sale_price),
          qty: 1,
        },
      ];
    });
  }

  function bump(id: string, d: number) {
    setCart((c) =>
      c
        .map((l) => (l.productId === id ? { ...l, qty: l.qty + d } : l))
        .filter((l) => l.qty > 0),
    );
  }

  const shown = products.filter(
    (p) => !q || p.name.toLowerCase().includes(q.toLowerCase()),
  );

  async function confirm(args: {
    paidCash: number;
    creditAmount: number;
    customerId: string | null;
  }) {
    const cust = customers.find((c) => c.id === args.customerId) ?? null;
    await completeSale(supabase, {
      lines: cart,
      paidCash: args.paidCash,
      creditAmount: args.creditAmount,
      customerId: args.customerId,
      customerName: cust?.name ?? null,
    });
    setCart([]);
    setCheckout(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 pb-40">
      <Link href="/shop" className="text-sm text-muted">
        ‹ Shop
      </Link>

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No products yet. Add stock in{" "}
          <Link href="/shop/stock" className="font-semibold text-forest">
            Stock
          </Link>
          .
        </p>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products"
            className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-forest"
          />
          <div className="grid grid-cols-2 gap-2">
            {shown.map((p) => {
              const left = Number(p.stock) - qtyInCart(p.id);
              const out = left <= 0;
              return (
                <button
                  key={p.id}
                  disabled={out}
                  onClick={() => add(p)}
                  className={`rounded-xl border border-line bg-card p-3 text-left active:scale-[0.98] ${
                    out ? "opacity-45" : ""
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">{p.name}</p>
                  <p className="numeric text-xs text-forest">
                    {fmtRs(Number(p.sale_price))}/{p.unit}
                  </p>
                  <p className="text-[11px] text-muted">
                    {out ? "Out of stock" : `${left} ${p.unit} left`}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {cart.length > 0 ? (
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-[480px] border-t border-line bg-paper/98 px-5 py-3 backdrop-blur">
          <div className="max-h-40 overflow-y-auto">
            {cart.map((l) => (
              <div
                key={l.productId}
                className="flex items-center justify-between py-1 text-sm"
              >
                <span className="min-w-0 truncate text-ink">{l.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => bump(l.productId, -1)}
                    className="h-6 w-6 rounded-md border border-line text-muted"
                  >
                    −
                  </button>
                  <span className="numeric w-6 text-center">{l.qty}</span>
                  <button
                    onClick={() => bump(l.productId, 1)}
                    className="h-6 w-6 rounded-md border border-line text-muted"
                  >
                    +
                  </button>
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCheckout(true)}
            className="mt-2 w-full rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper"
          >
            Charge {fmtRs(total)}
          </button>
        </div>
      ) : null}

      <Sheet
        open={checkout}
        title={`Total ${fmtRs(total)}`}
        onClose={() => setCheckout(false)}
      >
        <CheckoutForm
          total={total}
          customers={customers}
          onConfirm={confirm}
        />
      </Sheet>
    </div>
  );
}

function CheckoutForm({
  total,
  customers,
  onConfirm,
}: {
  total: number;
  customers: { id: string; name: string }[];
  onConfirm: (a: {
    paidCash: number;
    creditAmount: number;
    customerId: string | null;
  }) => void;
}) {
  const [mode, setMode] = useState<"cash" | "credit" | "partial">("cash");
  const [customerId, setCustomerId] = useState("");
  const [cashNow, setCashNow] = useState("");
  const [busy, setBusy] = useState(false);

  const needsCustomer = mode !== "cash";
  const paidCash =
    mode === "cash"
      ? total
      : mode === "credit"
        ? 0
        : Math.min(Math.max(parseFloat(cashNow) || 0, 0), total);
  const creditAmount = Math.round((total - paidCash) * 100) / 100;
  const canSubmit =
    total > 0 && (!needsCustomer || customerId) && !busy;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-xl border border-line p-1">
        {(["cash", "credit", "partial"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
              mode === m ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "partial" ? (
        <input
          value={cashNow}
          onChange={(e) => setCashNow(e.target.value)}
          placeholder="Cash received now"
          inputMode="decimal"
          className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
      ) : null}

      {needsCustomer ? (
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        >
          <option value="">Select customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ) : null}

      {needsCustomer ? (
        <p className="text-xs text-muted">
          {fmtRs(creditAmount)} goes on the customer&apos;s ledger.
        </p>
      ) : null}

      <button
        onClick={() => {
          if (!canSubmit) return;
          setBusy(true);
          onConfirm({
            paidCash,
            creditAmount,
            customerId: needsCustomer ? customerId : null,
          });
        }}
        disabled={!canSubmit}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? "Saving…" : "Complete sale"}
      </button>
    </div>
  );
}
