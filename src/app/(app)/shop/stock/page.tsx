import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { fetchSuppliers } from "@/lib/khata/db";
import {
  fetchProducts,
  fetchPurchases,
  fetchStockMoves,
  type Product,
  type Purchase,
  type StockMove,
} from "@/lib/khata/shop-db";
import StockClient from "./StockClient";

export const dynamic = "force-dynamic";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ low?: string }>;
}) {
  const { low } = await searchParams;
  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";

  let products: Product[] = [];
  let purchases: Purchase[] = [];
  let moves: StockMove[] = [];
  let suppliers: { id: string; name: string }[] = [];
  try {
    const [p, pu, mv, s] = await Promise.all([
      fetchProducts(db, bid),
      fetchPurchases(db, bid),
      fetchStockMoves(db, bid),
      fetchSuppliers(db, bid),
    ]);
    products = p;
    purchases = pu;
    moves = mv;
    suppliers = s.map((x) => ({ id: x.id, name: x.name }));
  } catch {
    /* render empty */
  }

  return (
    <StockClient
      businessId={bid}
      products={products}
      purchases={purchases}
      moves={moves}
      suppliers={suppliers}
      initialTab={low ? "low" : "all"}
    />
  );
}
