import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import {
  fetchCustomers,
  fetchKhataTx,
  fetchSupplierTx,
  fetchSuppliers,
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
  try {
    [customers, suppliers, khataTx, supplierTx] = await Promise.all([
      fetchCustomers(supabase, bid),
      fetchSuppliers(supabase, bid),
      fetchKhataTx(supabase, bid),
      fetchSupplierTx(supabase, bid),
    ]);
  } catch {
    /* render empty */
  }

  return (
    <LedgerClient
      businessId={bid}
      customers={customers}
      suppliers={suppliers}
      khataTx={khataTx}
      supplierTx={supplierTx}
    />
  );
}
