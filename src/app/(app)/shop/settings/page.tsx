import { createClient } from "@/lib/supabase/server";
import { fetchProfile, type ShopProfile } from "@/lib/khata/profile";
import ShopSettingsClient from "./ShopSettingsClient";

export const dynamic = "force-dynamic";

export default async function ShopSettingsPage() {
  const db = await createClient();
  let profile: ShopProfile | null = null;
  try {
    profile = await fetchProfile(db);
  } catch {
    /* ignore */
  }
  return <ShopSettingsClient profile={profile} />;
}
