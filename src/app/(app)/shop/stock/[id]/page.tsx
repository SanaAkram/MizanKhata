import Link from "next/link";
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
import StockItemClient from "./StockItemClient";

export const dynamic = "force-dynamic";

export default async function StockItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      fetchStockMoves(db, bid, id),
      fetchSuppliers(db, bid),
    ]);
    products = p;
    purchases = pu;
    moves = mv;
    suppliers = s.map((x) => ({ id: x.id, name: x.name }));
  } catch {
    /* fall through */
  }

  const product = products.find((x) => x.id === id);
  if (!product) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        <p className="text-sm text-muted">Product not found.</p>
        <Link
          href="/shop/stock"
          className="mt-3 inline-block text-sm font-semibold text-forest underline underline-offset-4"
        >
          Back to stock
        </Link>
      </div>
    );
  }

  return (
    <StockItemClient
      businessId={bid}
      product={product}
      products={products}
      purchases={purchases.filter((x) => x.product_id === id)}
      moves={moves}
      suppliers={suppliers}
    />
  );
}
