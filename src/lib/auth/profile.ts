import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/** The signed-in user's profile row, or null. Cached per request. */
export const getProfile = cache(async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();
  return data ?? null;
});

/** True for a business account (default when there's no profile row yet). */
export async function isBusinessAccount(): Promise<boolean> {
  const p = await getProfile();
  return (p?.account_type ?? "business") !== "personal";
}

export async function isPremium(): Promise<boolean> {
  return (await getProfile())?.is_premium === true;
}
