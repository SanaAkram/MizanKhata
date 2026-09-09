import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import type { Business } from "@/lib/khata/business";
import {
  fetchSaleItems,
  fetchSales,
  type Sale,
  type SaleItem,
} from "@/lib/khata/shop-db";
import BillsClient from "./BillsClient";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";

  let sales: Sale[] = [];
  let items: SaleItem[] = [];
  try {
    [sales, items] = await Promise.all([
      fetchSales(db, bid),
      fetchSaleItems(db, bid),
    ]);
  } catch {
    /* render empty */
  }
  return <BillsClient sales={sales} items={items} business={active} />;
}

export type { Business };
