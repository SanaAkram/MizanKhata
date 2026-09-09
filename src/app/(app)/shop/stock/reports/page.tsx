import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import {
  fetchProducts,
  fetchPurchases,
  fetchStockMoves,
  type Product,
  type Purchase,
  type StockMove,
} from "@/lib/khata/shop-db";

export const dynamic = "force-dynamic";

type Line = {
  id: string;
  name: string;
  unit: string;
  qty: number;
  rate: number | null;
  date: string;
  note: string | null;
};

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const kind = type === "out" ? "out" : "in";

  const db = await createClient();
  let products: Product[] = [];
  let purchases: Purchase[] = [];
  let moves: StockMove[] = [];
  try {
    [products, purchases, moves] = await Promise.all([
      fetchProducts(db),
      fetchPurchases(db),
      fetchStockMoves(db),
    ]);
  } catch {
    /* empty */
  }
  const pname = (id: string | null) =>
    products.find((p) => p.id === id) ?? { name: "—", unit: "" };

  const lines: Line[] = [];
  if (kind === "in") {
    for (const p of purchases) {
      const pr = pname(p.product_id);
      lines.push({
        id: p.id,
        name: pr.name,
        unit: pr.unit,
        qty: Number(p.qty),
        rate: Number(p.price),
        date: p.date,
        note: p.ref,
      });
    }
  }
  for (const m of moves.filter((x) => x.kind === kind)) {
    const pr = pname(m.product_id);
    lines.push({
      id: m.id,
      name: pr.name,
      unit: pr.unit,
      qty: Number(m.qty),
      rate: m.rate == null ? null : Number(m.rate),
      date: m.date,
      note: m.note,
    });
  }
  lines.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const totalAmt = lines.reduce((s, l) => s + (l.rate ?? 0) * l.qty, 0);

  return (
    <div className="flex flex-col gap-3">
      <Link href="/shop/stock" className="text-sm text-muted">
        ‹ Stock
      </Link>
      <h1 className="numeric text-lg font-semibold text-forest">
        Stock {kind === "in" ? "IN" : "OUT"} report
      </h1>
      <div className="flex gap-3">
        <Link
          href="/shop/stock/reports?type=in"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            kind === "in" ? "bg-forest text-paper" : "border border-line text-muted"
          }`}
        >
          IN
        </Link>
        <Link
          href="/shop/stock/reports?type=out"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            kind === "out"
              ? "bg-forest text-paper"
              : "border border-line text-muted"
          }`}
        >
          OUT
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted">Total qty</p>
          <p className="numeric mt-1 text-lg font-semibold text-ink">
            {Math.round(totalQty).toLocaleString("en-US")}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted">
            Total value
          </p>
          <p className="numeric mt-1 text-lg font-semibold text-ink">
            {fmtRs(totalAmt)}
          </p>
        </div>
      </section>

      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Nothing here yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lines.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate text-ink">{l.name}</span>
                <span className="text-[11px] text-muted">
                  {fmtEntryDate(l.date)}
                  {l.rate != null ? ` · ${fmtRs(l.rate)}` : ""}
                </span>
              </span>
              <span
                className={`numeric shrink-0 font-semibold ${
                  kind === "in" ? "text-ok" : "text-danger"
                }`}
              >
                {kind === "in" ? "+" : "−"}
                {Math.round(l.qty).toLocaleString("en-US")} {l.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
