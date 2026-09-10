import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { fetchCustomers, fetchSuppliers } from "@/lib/khata/db";
import { fetchProducts, type Product } from "@/lib/khata/shop-db";
import PosClient, { type PartyOpt } from "./PosClient";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";

  let products: Product[] = [];
  let parties: PartyOpt[] = [];
  try {
    const [p, c, s] = await Promise.all([
      fetchProducts(db, bid),
      fetchCustomers(db, bid),
      fetchSuppliers(db, bid),
    ]);
    products = p;
    parties = [
      ...c.map((x) => ({ id: x.id, name: x.name, kind: "customer" as const })),
      ...s.map((x) => ({ id: x.id, name: x.name, kind: "supplier" as const })),
    ];
  } catch {
    /* render empty */
  }

  return <PosClient businessId={bid} products={products} parties={parties} />;
}
