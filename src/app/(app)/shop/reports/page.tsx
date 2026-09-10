import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { fetchCashbook, type Cash } from "@/lib/khata/db";
import {
  fetchProducts,
  fetchPurchases,
  fetchSaleItems,
  fetchSales,
  type Product,
  type Purchase,
  type Sale,
  type SaleItem,
} from "@/lib/khata/shop-db";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function ReportsPage() {
  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";

  const [sales, saleItems, purchases, products, cash] = await Promise.all([
    safe<Sale[]>(fetchSales(db, bid), []),
    safe<SaleItem[]>(fetchSaleItems(db, bid), []),
    safe<Purchase[]>(fetchPurchases(db, bid), []),
    safe<Product[]>(fetchProducts(db, bid), []),
    safe<Cash[]>(fetchCashbook(db, bid), []),
  ]);

  return (
    <ReportsClient
      sales={sales}
      saleItems={saleItems}
      purchases={purchases}
      products={products}
      cash={cash}
    />
  );
}
