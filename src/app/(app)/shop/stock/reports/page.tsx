import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import {
  fetchProducts,
  fetchPurchases,
  fetchStockMoves,
  type Product,
  type Purchase,
  type StockMove,
} from "@/lib/khata/shop-db";
import StockReportClient, { type ReportLine } from "./StockReportClient";

export const dynamic = "force-dynamic";

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const kind = type === "out" ? "out" : "in";

  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";
  let products: Product[] = [];
  let purchases: Purchase[] = [];
  let moves: StockMove[] = [];
  try {
    [products, purchases, moves] = await Promise.all([
      fetchProducts(db, bid),
      fetchPurchases(db, bid),
      fetchStockMoves(db, bid),
    ]);
  } catch {
    /* empty */
  }
  const pname = (id: string | null) =>
    products.find((p) => p.id === id) ?? { name: "—", unit: "" };

  const lines: ReportLine[] = [];
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

  return <StockReportClient kind={kind} lines={lines} />;
}
