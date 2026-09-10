import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { serverT } from "@/lib/i18n-server";
import { getProfile } from "@/lib/auth/profile";
import SignOutButton from "./SignOutButton";
import LanguagePicker from "./LanguagePicker";
import ProfileSection from "./ProfileSection";

export default async function SettingsPage() {
  const supabase = await createClient();
  const t = await serverT();
  const [{ data: { user } }, profile] = await Promise.all([
    supabase.auth.getUser(),
    getProfile(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("settings.account", "Account")}
        </h2>
        <p className="mt-2 text-sm text-ink">{user?.email ?? "—"}</p>
        {profile?.is_premium ? (
          <p className="mt-1 text-xs font-semibold text-gold">Premium</p>
        ) : null}
      </section>

      <ProfileSection profile={profile} />

      <LanguagePicker />

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("settings.routine", "Routine")}
        </h2>
        <Link
          href="/routine/settings"
          className="mt-2 inline-block text-sm font-medium text-forest underline underline-offset-4"
        >
          {t("settings.editRoutine", "Edit routine items & times")}
        </Link>
      </section>

      <SignOutButton />

      <p className="text-center text-xs text-muted">MizanKhata · v0.1</p>
    </div>
  );
}
