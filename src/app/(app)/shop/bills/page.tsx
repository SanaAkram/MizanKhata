import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import type { Business } from "@/lib/khata/business";
import { fetchCustomers, fetchKhataTx } from "@/lib/khata/db";
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
  let customers: { id: string; name: string; phone: string | null }[] = [];
  let khataTx: { customer_id: string; type: string; amount: number }[] = [];
  try {
    const [s, it, c, k] = await Promise.all([
      fetchSales(db, bid),
      fetchSaleItems(db, bid),
      fetchCustomers(db, bid),
      fetchKhataTx(db, bid),
    ]);
    sales = s;
    items = it;
    customers = c.map((x) => ({ id: x.id, name: x.name, phone: x.phone }));
    khataTx = k.map((x) => ({
      customer_id: x.customer_id,
      type: x.type,
      amount: Number(x.amount),
    }));
  } catch {
    /* render empty */
  }

  return (
    <BillsClient
      businessId={bid}
      sales={sales}
      items={items}
      customers={customers}
      khataTx={khataTx}
      business={(active as Business) ?? null}
    />
  );
}
