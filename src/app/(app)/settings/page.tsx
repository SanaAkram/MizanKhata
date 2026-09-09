import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Account
        </h2>
        <p className="mt-2 text-sm text-ink">{user?.email ?? "—"}</p>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Routine
        </h2>
        <Link
          href="/routine/settings"
          className="mt-2 inline-block text-sm font-medium text-forest underline underline-offset-4"
        >
          Edit routine items &amp; times
        </Link>
      </section>

      <SignOutButton />

      <p className="text-center text-xs text-muted">Roznamcha · v0.1</p>
    </div>
  );
}
