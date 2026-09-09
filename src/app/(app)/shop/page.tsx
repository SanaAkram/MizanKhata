import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtRs } from "@/lib/format";
import {
  buildParties,
  cashInHand,
  fetchCashbook,
  fetchCustomers,
  fetchKhataTx,
  fetchSupplierTx,
  fetchSuppliers,
} from "@/lib/khata/db";
import {
  fetchProducts,
  fetchPurchases,
  fetchSaleItems,
  fetchSales,
  grossProfit,
  stockValue,
  topSellers,
} from "@/lib/khata/shop-db";

export const dynamic = "force-dynamic";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function ShopDashboardPage() {
  const db = await createClient();
  const [
    customers,
    suppliers,
    khataTx,
    supplierTx,
    cash,
    products,
    sales,
    saleItems,
    purchases,
  ] = await Promise.all([
    safe(fetchCustomers(db), []),
    safe(fetchSuppliers(db), []),
    safe(fetchKhataTx(db), []),
    safe(fetchSupplierTx(db), []),
    safe(fetchCashbook(db), []),
    safe(fetchProducts(db), []),
    safe(fetchSales(db), []),
    safe(fetchSaleItems(db), []),
    safe(fetchPurchases(db), []),
  ]);

  const parties = buildParties(customers, suppliers, khataTx, supplierTx);
  const receivables = parties
    .filter((p) => p.kind === "customer" && p.balance > 0)
    .reduce((s, p) => s + p.balance, 0);
  const payables = parties
    .filter((p) => p.kind === "supplier" && p.balance > 0)
    .reduce((s, p) => s + p.balance, 0);

  const totalSales = sales.reduce((s, b) => s + Number(b.total || 0), 0);
  const totalPurchases = purchases.reduce(
    (s, p) => s + Number(p.qty || 0) * Number(p.price || 0),
    0,
  );
  const profit = grossProfit(saleItems, purchases, products);
  const stockVal = stockValue(products, purchases);
  const inStock = products.filter((p) => Number(p.stock) > 0).length;
  const top = topSellers(saleItems, products, 5);

  const cards = [
    { href: "/shop/pos", label: "Sell", sub: "New bill · POS" },
    { href: "/shop/stock", label: "Stock", sub: `${products.length} items` },
    { href: "/shop/bills", label: "Bills", sub: `${sales.length} bills` },
    { href: "/cashbook", label: "Cash Book", sub: fmtRs(cashInHand(cash)) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link
          href="/shop/settings"
          className="text-xs font-semibold text-muted underline underline-offset-4"
        >
          Shop details
        </Link>
      </div>
      <section className="rounded-2xl border border-line bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Net profit (lifetime)
        </p>
        <p className="numeric mt-1 text-3xl font-semibold text-forest">
          {fmtRs(profit)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Stat label="Total sales" value={fmtRs(totalSales)} tone="ok" />
          <Stat
            label="Total purchases"
            value={fmtRs(totalPurchases)}
            tone="danger"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MiniCard label="You'll get" value={fmtRs(receivables)} tone="ok" />
        <MiniCard label="You'll give" value={fmtRs(payables)} tone="danger" />
        <MiniCard label="Stock value" value={fmtRs(stockVal)} />
        <MiniCard label="Items in stock" value={String(inStock)} />
      </section>

      <section className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-line bg-card p-4 active:scale-[0.99]"
          >
            <p className="text-sm font-semibold text-ink">{c.label}</p>
            <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
          </Link>
        ))}
      </section>

      {top.length > 0 ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Top selling
          </h2>
          <ul className="flex flex-col gap-1.5">
            {top.map((t) => (
              <li
                key={t.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink">{t.name}</span>
                <span className="numeric font-semibold text-forest">
                  {Math.round(t.qty).toLocaleString("en-US")} {t.unit}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "danger";
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`numeric font-semibold ${
          tone === "ok"
            ? "text-ok"
            : tone === "danger"
              ? "text-danger"
              : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={`numeric mt-1 text-lg font-semibold ${
          tone === "ok"
            ? "text-ok"
            : tone === "danger"
              ? "text-danger"
              : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
