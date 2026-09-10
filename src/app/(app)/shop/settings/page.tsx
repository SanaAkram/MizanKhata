import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { isPremium } from "@/lib/auth/profile";
import ShopSettingsClient from "./ShopSettingsClient";

export const dynamic = "force-dynamic";

export default async function ShopSettingsPage() {
  const db = await createClient();
  const [{ list, active }, premium] = await Promise.all([
    resolveBusiness(db),
    isPremium(),
  ]);
  return (
    <ShopSettingsClient
      list={list}
      activeId={active?.id ?? ""}
      premium={premium}
    />
  );
}
