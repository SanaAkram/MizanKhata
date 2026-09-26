import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { serverT } from "@/lib/i18n-server";
import { getProfile } from "@/lib/auth/profile";
import ProfileSection from "../ProfileSection";
import AccountSecurity from "../AccountSecurity";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const t = await serverT();
  const [{ data: { user } }, profile] = await Promise.all([
    supabase.auth.getUser(),
    getProfile(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/settings" className="text-sm text-muted">
        ‹ {t("title./settings", "Settings")}
      </Link>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("settings.account", "Account")}
        </h2>
        <p className="mt-2 text-sm text-ink">
          {t("settings.accountType", "Account type")}:{" "}
          <span
            className={`font-semibold ${
              profile?.is_premium ? "text-gold" : "text-ink"
            }`}
          >
            {profile?.is_premium
              ? t("settings.premium", "Premium")
              : t("settings.free", "Free")}
          </span>
        </p>
      </section>

      <ProfileSection profile={profile} />

      <AccountSecurity email={user?.email ?? ""} />
    </div>
  );
}
