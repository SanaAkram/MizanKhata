import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { fetchCustomers } from "@/lib/khata/db";
import { fetchProducts, type Product } from "@/lib/khata/shop-db";
import PosClient from "./PosClient";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";

  let products: Product[] = [];
  let customers: { id: string; name: string }[] = [];
  try {
    const [p, c] = await Promise.all([
      fetchProducts(db, bid),
      fetchCustomers(db, bid),
    ]);
    products = p;
    customers = c.map((x) => ({ id: x.id, name: x.name }));
  } catch {
    /* render empty */
  }

  return (
    <PosClient businessId={bid} products={products} customers={customers} />
  );
}
