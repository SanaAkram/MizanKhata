import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import ShopSettingsClient from "./ShopSettingsClient";

export const dynamic = "force-dynamic";

export default async function ShopSettingsPage() {
  const db = await createClient();
  const { list, active } = await resolveBusiness(db);
  return <ShopSettingsClient list={list} activeId={active?.id ?? ""} />;
}
