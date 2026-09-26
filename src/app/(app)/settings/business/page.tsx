import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { serverT } from "@/lib/i18n-server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { isPremium } from "@/lib/auth/profile";
import ShopSettingsClient from "../ShopSettingsClient";

export const dynamic = "force-dynamic";

export default async function BusinessSettingsPage() {
  const supabase = await createClient();
  const t = await serverT();
  const [{ list, active }, premium] = await Promise.all([
    resolveBusiness(supabase),
    isPremium(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/settings" className="text-sm text-muted">
        ‹ {t("title./settings", "Settings")}
      </Link>

      <ShopSettingsClient
        list={list}
        activeId={active?.id ?? ""}
        premium={premium}
      />
    </div>
  );
}
