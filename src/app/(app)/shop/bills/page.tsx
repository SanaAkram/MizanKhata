import { createClient } from "@/lib/supabase/server";
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
  let sales: Sale[] = [];
  let items: SaleItem[] = [];
  try {
    [sales, items] = await Promise.all([fetchSales(db), fetchSaleItems(db)]);
  } catch {
    /* render empty */
  }
  return <BillsClient sales={sales} items={items} />;
}
