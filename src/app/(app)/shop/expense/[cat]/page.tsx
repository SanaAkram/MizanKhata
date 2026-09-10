import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { fetchCashbook, type Cash } from "@/lib/khata/db";
import { serverT } from "@/lib/i18n-server";
import { isExpenseRow } from "@/lib/khata/expense";
import ExpenseCategoryClient from "./ExpenseCategoryClient";

export const dynamic = "force-dynamic";

export default async function ExpenseCategoryPage({
  params,
}: {
  params: Promise<{ cat: string }>;
}) {
  const { cat: raw } = await params;
  const cat = decodeURIComponent(raw).toLowerCase();

  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";

  let cash: Cash[] = [];
  try {
    cash = await fetchCashbook(db, bid);
  } catch {
    cash = [];
  }

  const rows = cash.filter(
    (c) => isExpenseRow(c) && (c.category ?? "other").toLowerCase() === cat,
  );

  if (rows.length === 0) {
    const t = await serverT();
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        {t("exp.noneInCat", "No expenses in this category.")}
      </p>
    );
  }

  return <ExpenseCategoryClient category={cat} rows={rows} />;
}
