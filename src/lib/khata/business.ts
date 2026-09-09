import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { newId } from "@/lib/ids";

type DB = SupabaseClient<Database>;
export type Business = Database["public"]["Tables"]["shop_businesses"]["Row"];

export const BIZ_COOKIE = "rz_biz";

export async function listBusinesses(db: DB): Promise<Business[]> {
  const { data } = await db
    .from("shop_businesses")
    .select("*")
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function createBusiness(
  db: DB,
  name: string,
): Promise<Business | null> {
  const { data } = await db
    .from("shop_businesses")
    .insert({ id: newId("biz_"), name: name.trim() || "New shop" })
    .select("*")
    .single();
  return data ?? null;
}

export async function saveBusiness(
  db: DB,
  id: string,
  patch: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    logo_url?: string | null;
    logo_color?: string | null;
  },
): Promise<void> {
  const { error } = await db.from("shop_businesses").update(patch).eq("id", id);
  if (error) throw error;
}

/**
 * Delete a business and every row that belongs to it (customers, suppliers,
 * products, bills, ledger, cash book, stock moves). Irreversible.
 * The caller must keep at least one business.
 */
export async function deleteBusiness(db: DB, id: string): Promise<void> {
  const tables = [
    "shop_sale_items",
    "shop_sales",
    "shop_khata_tx",
    "shop_supplier_tx",
    "shop_cashbook",
    "shop_stock_moves",
    "shop_purchases",
    "shop_products",
    "shop_customers",
    "shop_suppliers",
  ] as const;
  for (const t of tables) {
    const { error } = await db.from(t).delete().eq("business_id", id);
    if (error) throw error;
  }
  const { error } = await db.from("shop_businesses").delete().eq("id", id);
  if (error) throw error;
}

/** Set the active business (client-side); caller should router.refresh() after. */
export function setActiveBusinessCookie(id: string): void {
  try {
    document.cookie = `${BIZ_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignore */
  }
}
