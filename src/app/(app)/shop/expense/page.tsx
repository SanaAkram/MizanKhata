import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { fetchCashbook, type Cash } from "@/lib/khata/db";
import ExpenseClient from "./ExpenseClient";

export const dynamic = "force-dynamic";

export default async function ExpensePage() {
  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";

  let cash: Cash[] = [];
  try {
    cash = await fetchCashbook(db, bid);
  } catch {
    cash = [];
  }

  return <ExpenseClient businessId={bid} cash={cash} />;
}
