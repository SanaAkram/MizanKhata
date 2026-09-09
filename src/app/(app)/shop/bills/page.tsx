import { createClient } from "@/lib/supabase/server";
import {
  fetchSaleItems,
  fetchSales,
  type Sale,
  type SaleItem,
} from "@/lib/khata/shop-db";
import { fetchProfile, type ShopProfile } from "@/lib/khata/profile";
import BillsClient from "./BillsClient";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const db = await createClient();
  let sales: Sale[] = [];
  let items: SaleItem[] = [];
  let profile: ShopProfile | null = null;
  try {
    [sales, items, profile] = await Promise.all([
      fetchSales(db),
      fetchSaleItems(db),
      fetchProfile(db),
    ]);
  } catch {
    /* render empty */
  }
  return <BillsClient sales={sales} items={items} profile={profile} />;
}
