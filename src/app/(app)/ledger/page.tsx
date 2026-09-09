import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import {
  cashInHand,
  fetchCashbook,
  fetchCustomers,
  fetchKhataTx,
  fetchSupplierTx,
  fetchSuppliers,
  type Cash,
  type Customer,
  type KhataTx,
  type Supplier,
  type SupplierTx,
} from "@/lib/khata/db";
import LedgerClient from "./LedgerClient";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const supabase = await createClient();
  const { active } = await resolveBusiness(supabase);
  const bid = active?.id ?? "";

  let customers: Customer[] = [];
  let suppliers: Supplier[] = [];
  let khataTx: KhataTx[] = [];
  let supplierTx: SupplierTx[] = [];
  let cash: Cash[] = [];
  try {
    [customers, suppliers, khataTx, supplierTx, cash] = await Promise.all([
      fetchCustomers(supabase, bid),
      fetchSuppliers(supabase, bid),
      fetchKhataTx(supabase, bid),
      fetchSupplierTx(supabase, bid),
      fetchCashbook(supabase, bid),
    ]);
  } catch {
    /* render empty */
  }

  const cashHand = cashInHand(cash.filter((c) => (c.method ?? "cash") === "cash"));
  const bankBal = cashInHand(cash.filter((c) => c.method === "bank"));

  return (
    <LedgerClient
      businessId={bid}
      customers={customers}
      suppliers={suppliers}
      khataTx={khataTx}
      supplierTx={supplierTx}
      cashHand={cashHand}
      bankBal={bankBal}
    />
  );
}
