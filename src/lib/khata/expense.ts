import type { Cash } from "./db";
import { inRange, type DateRange } from "@/lib/date-range";

/**
 * "Expenses" = money out of the shop that isn't a supplier payment (those
 * live on the supplier ledger) or an opening-balance row from an import.
 * Everything else that leaves as cash/bank is an expense, grouped by its
 * free-text category. Matches the dashboard's `expenses` figure.
 */
const NOT_EXPENSE = new Set(["payment", "opening"]);

export function isExpenseRow(c: Cash): boolean {
  return c.type === "out" && !NOT_EXPENSE.has((c.category ?? "").toLowerCase());
}

/** Suggested categories for the add form; the field also accepts a new one. */
export const EXPENSE_CATEGORIES = [
  "general",
  "rent",
  "salary",
  "bills",
  "transport",
  "food",
  "personal",
  "home",
  "repair",
  "purchase",
  "other",
];

export function expenseLabel(cat: string): string {
  const c = (cat || "other").trim();
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export type ExpenseCategory = {
  category: string;
  total: number;
  count: number;
  lastDate: string | null;
};

export function expenseRows(cash: Cash[], range?: DateRange): Cash[] {
  return cash.filter(
    (c) => isExpenseRow(c) && (!range || inRange(c.date, range)),
  );
}

export function expenseTotal(cash: Cash[], range?: DateRange): number {
  return expenseRows(cash, range).reduce(
    (s, c) => s + Number(c.amount || 0),
    0,
  );
}

/** One row per category, biggest spend first. */
export function expenseCategories(
  cash: Cash[],
  range?: DateRange,
): ExpenseCategory[] {
  const map = new Map<string, ExpenseCategory>();
  for (const c of expenseRows(cash, range)) {
    const key = (c.category ?? "other").toLowerCase() || "other";
    const cur =
      map.get(key) ?? { category: key, total: 0, count: 0, lastDate: null };
    cur.total += Number(c.amount || 0);
    cur.count += 1;
    if (!cur.lastDate || c.date > cur.lastDate) cur.lastDate = c.date;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
