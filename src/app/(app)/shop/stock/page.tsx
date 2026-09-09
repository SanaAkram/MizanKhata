import { createClient } from "@/lib/supabase/server";
import { fetchSuppliers } from "@/lib/khata/db";
import {
  fetchProducts,
  fetchPurchases,
  type Product,
  type Purchase,
} from "@/lib/khata/shop-db";
import StockClient from "./StockClient";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const db = await createClient();
  let products: Product[] = [];
  let purchases: Purchase[] = [];
  let suppliers: { id: string; name: string }[] = [];
  try {
    const [p, pu, s] = await Promise.all([
      fetchProducts(db),
      fetchPurchases(db),
      fetchSuppliers(db),
    ]);
    products = p;
    purchases = pu;
    suppliers = s.map((x) => ({ id: x.id, name: x.name }));
  } catch {
    /* render empty */
  }

  return (
    <StockClient
      products={products}
      purchases={purchases}
      suppliers={suppliers}
    />
  );
}
