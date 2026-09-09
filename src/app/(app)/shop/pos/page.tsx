import { createClient } from "@/lib/supabase/server";
import { fetchCustomers } from "@/lib/khata/db";
import { fetchProducts, type Product } from "@/lib/khata/shop-db";
import PosClient from "./PosClient";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const db = await createClient();
  let products: Product[] = [];
  let customers: { id: string; name: string }[] = [];
  try {
    const [p, c] = await Promise.all([
      fetchProducts(db),
      fetchCustomers(db),
    ]);
    products = p;
    customers = c.map((x) => ({ id: x.id, name: x.name }));
  } catch {
    /* render empty */
  }

  return <PosClient products={products} customers={customers} />;
}
