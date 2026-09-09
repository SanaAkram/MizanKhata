import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
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
  const { active } = await resolveBusiness(supabase);
  const bid = active?.id ?? "";

  let cash: Cash[] = [];
  let customers: Customer[] = [];
  let suppliers: Supplier[] = [];
  try {
    [cash, customers, suppliers] = await Promise.all([
      fetchCashbook(supabase, bid),
      fetchCustomers(supabase, bid),
      fetchSuppliers(supabase, bid),
    ]);
  } catch {
    /* render empty */
  }

  return (
    <CashbookClient
      businessId={bid}
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
