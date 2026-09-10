import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { serverT } from "@/lib/i18n-server";
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
import MiniBars, { ShareBars, type BarPoint } from "@/components/MiniBars";

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
  const t = await serverT();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";
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
    safe(fetchCustomers(db, bid), []),
    safe(fetchSuppliers(db, bid), []),
    safe(fetchKhataTx(db, bid), []),
    safe(fetchSupplierTx(db, bid), []),
    safe(fetchCashbook(db, bid), []),
    safe(fetchProducts(db, bid), []),
    safe(fetchSales(db, bid), []),
    safe(fetchSaleItems(db, bid), []),
    safe(fetchPurchases(db, bid), []),
  ]);

  const parties = buildParties(customers, suppliers, khataTx, supplierTx);
  const recvByParty = parties
    .filter((p) => p.kind === "customer" && p.balance > 0)
    .map((p) => ({ name: p.name, amount: p.balance }))
    .sort((a, b) => b.amount - a.amount);
  const payByParty = parties
    .filter((p) => p.kind === "supplier" && p.balance > 0)
    .map((p) => ({ name: p.name, amount: p.balance }))
    .sort((a, b) => b.amount - a.amount);
  const receivables = recvByParty.reduce((s, p) => s + p.amount, 0);
  const payables = payByParty.reduce((s, p) => s + p.amount, 0);

  const totalSales = sales.reduce((s, b) => s + Number(b.total || 0), 0);
  const totalPurchases = purchases.reduce(
    (s, p) => s + Number(p.qty || 0) * Number(p.price || 0),
    0,
  );
  const expenses = cash
    .filter((c) => c.type === "out" && (c.category ?? "") !== "payment")
    .reduce((s, c) => s + Number(c.amount || 0), 0);
  const profit = grossProfit(saleItems, purchases, products) - expenses;
  const stockVal = stockValue(products, purchases);
  const inStock = products.filter((p) => Number(p.stock) > 0).length;
  const top = topSellers(saleItems, products, 5);
  const restock = products
    .filter((p) => Number(p.stock) <= (Number(p.low_stock) || 5))
    .sort((a, b) => Number(a.stock) - Number(b.stock))
    .slice(0, 8);

  const cashHand = cashInHand(cash.filter((c) => (c.method ?? "cash") === "cash"));
  const bankBal = cashInHand(cash.filter((c) => c.method === "bank"));

  // last 6 months income vs expense
  const parts = new Date().toISOString().slice(0, 7).split("-").map(Number);
  const months: BarPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const y = parts[0];
    const m0 = parts[1] - 1 - i;
    const d = new Date(y, m0, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const inM = (iso: string | null) => (iso ?? "").slice(0, 7) === key;
    const income = sales
      .filter((s) => inM(s.time))
      .reduce((a, s) => a + Number(s.total || 0), 0);
    const expense =
      purchases
        .filter((p) => inM(p.date))
        .reduce((a, p) => a + Number(p.qty || 0) * Number(p.price || 0), 0) +
      cash
        .filter(
          (c) =>
            c.type === "out" && (c.category ?? "") !== "payment" && inM(c.date),
        )
        .reduce((a, c) => a + Number(c.amount || 0), 0);
    months.push({
      label: d.toLocaleDateString([], { month: "short" }),
      income,
      expense,
    });
  }
  const hasChart = months.some((m) => m.income > 0 || m.expense > 0);

  const cards = [
    { href: "/shop/pos", label: t("title./shop/pos", "Sell"), sub: "POS" },
    {
      href: "/shop/stock",
      label: t("nav.shop", "Stock"),
      sub: `${products.length} ${t("stock.items", "items")}`,
    },
    {
      href: "/shop/bills",
      label: t("title./shop/bills", "Bills"),
      sub: `${sales.length}`,
    },
    { href: "/cashbook", label: t("title./cashbook", "Cash Book"), sub: fmtRs(cashHand) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link
          href="/shop/settings"
          className="text-xs font-semibold text-muted underline underline-offset-4"
        >
          {t("dash.shopDetails", "Shop details")}
        </Link>
      </div>

      <section className="rounded-2xl border border-line bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("dash.netProfit", "Net profit (lifetime)")}
        </p>
        <p className="numeric mt-1 text-3xl font-semibold text-forest">
          {fmtRs(profit)}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
          <Stat label={t("dash.sales", "Sales")} value={fmtRs(totalSales)} tone="ok" />
          <Stat
            label={t("dash.purchases", "Purchases")}
            value={fmtRs(totalPurchases)}
            tone="danger"
          />
          <Stat
            label={t("dash.expenses", "Expenses")}
            value={fmtRs(expenses)}
            tone="danger"
          />
        </div>
        {hasChart ? (
          <div className="mt-4">
            <MiniBars data={months} />
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MiniCard
          label={t("ledger.youllGet", "You'll get")}
          value={fmtRs(receivables)}
          tone="ok"
        />
        <MiniCard
          label={t("ledger.youllGive", "You'll give")}
          value={fmtRs(payables)}
          tone="danger"
        />
        <MiniCard label={t("cash.inHand", "Cash in hand")} value={fmtRs(cashHand)} />
        <MiniCard label={t("cash.bankBal", "Bank balance")} value={fmtRs(bankBal)} />
        <MiniCard
          label={t("stock.totalValue", "Stock value")}
          value={fmtRs(stockVal)}
        />
        <MiniCard
          label={t("dash.itemsInStock", "Items in stock")}
          value={String(inStock)}
        />
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

      {recvByParty.length > 0 ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
            {t("dash.receivables", "Receivables")}{" "}
            <span className="numeric">{fmtRs(receivables)}</span>
          </h2>
          <ShareBars items={recvByParty} tone="ok" />
        </section>
      ) : null}

      {payByParty.length > 0 ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
            {t("dash.payables", "Payables")}{" "}
            <span className="numeric">{fmtRs(payables)}</span>
          </h2>
          <ShareBars items={payByParty} tone="danger" />
        </section>
      ) : null}

      {restock.length > 0 ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("dash.restockSoon", "Restock soon")}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {restock.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/shop/stock/${p.id}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-ink">{p.name}</span>
                  <span className="numeric font-semibold text-danger">
                    {Math.round(Number(p.stock))} {p.unit}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {top.length > 0 ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("dash.topSelling", "Top selling")}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {top.map((ts) => (
              <li
                key={ts.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink">{ts.name}</span>
                <span className="numeric font-semibold text-forest">
                  {Math.round(ts.qty).toLocaleString("en-US")} {ts.unit}
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
        className={`numeric text-sm font-semibold ${
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
