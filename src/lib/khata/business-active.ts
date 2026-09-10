import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { newId } from "@/lib/ids";
import { BIZ_COOKIE, listBusinesses, type Business } from "./business";

type DB = SupabaseClient<Database>;

/**
 * Server-only. Ensures the signed-in user has at least one business, then
 * returns the full list and the one selected via the `rz_biz` cookie.
 *
 * Wrapped in React `cache()` so it runs once per request even if several
 * server components ask for it.
 */
export const resolveBusiness = cache(async function resolveBusiness(
  db: DB,
): Promise<{ list: Business[]; active: Business | null }> {
  let list = await listBusinesses(db);
  if (list.length === 0) {
    const { data } = await db
      .from("shop_businesses")
      .insert({ id: newId("biz_"), name: "My Shop" })
      .select("*")
      .single();
    if (data) list = [data];
  }
  const jar = await cookies();
  const want = jar.get(BIZ_COOKIE)?.value;
  const active = list.find((b) => b.id === want) ?? list[0] ?? null;
  return { list, active };
});

export async function activeBusinessId(db: DB): Promise<string> {
  const { active } = await resolveBusiness(db);
  return active?.id ?? "";
}
