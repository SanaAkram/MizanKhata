import { createClient } from "@/lib/supabase/server";
import {
  fetchCashbook,
  fetchCustomers,
  fetchSuppliers,
  type Cash,
  type Customer,
  type Supplier,
} from "@/lib/khata/db";
import CashbookClient from "./CashbookClient";

export const dynamic = "force-dynamic";

export default async function CashbookPage() {
  const supabase = await createClient();
  let cash: Cash[] = [];
  let customers: Customer[] = [];
  let suppliers: Supplier[] = [];
  try {
    [cash, customers, suppliers] = await Promise.all([
      fetchCashbook(supabase),
      fetchCustomers(supabase),
      fetchSuppliers(supabase),
    ]);
  } catch {
    /* render empty */
  }

  return (
    <CashbookClient
      cash={cash}
      parties={[
        ...customers.map((c) => ({
          id: c.id,
          name: c.name,
          kind: "customer" as const,
        })),
        ...suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          kind: "supplier" as const,
        })),
      ]}
    />
  );
}
