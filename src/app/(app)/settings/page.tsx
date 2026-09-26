import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { serverT } from "@/lib/i18n-server";
import { getProfile } from "@/lib/auth/profile";
import { resolveBusiness } from "@/lib/khata/business-active";
import SignOutButton from "./SignOutButton";
import LanguagePicker from "./LanguagePicker";

export const dynamic = "force-dynamic";

function SettingsRow({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-muted">›</span>
    </Link>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const t = await serverT();
  const [profile, { active }] = await Promise.all([
    getProfile(),
    resolveBusiness(supabase),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        href="/settings/account"
        title={t("settings.account", "Account")}
        subtitle={`${t("settings.accountType", "Account type")}: ${
          profile?.is_premium
            ? t("settings.premium", "Premium")
            : t("settings.free", "Free")
        }`}
      />

      <SettingsRow
        href="/settings/business"
        title={t("settings.shop", "Business")}
        subtitle={active?.name ?? ""}
      />

      <LanguagePicker />

      <SettingsRow
        href="/routine/settings"
        title={t("settings.routine", "Routine")}
        subtitle={t("settings.editRoutine", "Items & times")}
      />

      <SignOutButton />

      <p className="text-center text-xs text-muted">MizanKhata · v0.1</p>
    </div>
  );
}
