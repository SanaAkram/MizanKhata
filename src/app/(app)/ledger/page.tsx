import { createClient } from "@/lib/supabase/server";
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
  let customers: Customer[] = [];
  let suppliers: Supplier[] = [];
  let khataTx: KhataTx[] = [];
  let supplierTx: SupplierTx[] = [];
  try {
    [customers, suppliers, khataTx, supplierTx] = await Promise.all([
      fetchCustomers(supabase),
      fetchSuppliers(supabase),
      fetchKhataTx(supabase),
      fetchSupplierTx(supabase),
    ]);
  } catch {
    /* render empty */
  }

  return (
    <LedgerClient
      customers={customers}
      suppliers={suppliers}
      khataTx={khataTx}
      supplierTx={supplierTx}
    />
  );
}
