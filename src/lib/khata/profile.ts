import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

export type ShopProfile =
  Database["public"]["Tables"]["shop_profile"]["Row"];

export async function fetchProfile(db: DB): Promise<ShopProfile | null> {
  const { data } = await db.from("shop_profile").select("*").maybeSingle();
  return data ?? null;
}

export async function saveProfile(
  db: DB,
  p: { shop_name: string; phone: string | null; address: string | null },
): Promise<void> {
  const { error } = await db.from("shop_profile").upsert(
    {
      shop_name: p.shop_name.trim() || "My Shop",
      phone: p.phone?.trim() || null,
      address: p.address?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" },
  );
  if (error) throw error;
}
