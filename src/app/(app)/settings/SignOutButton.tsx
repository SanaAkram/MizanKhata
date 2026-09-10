"use client";

import { useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { useT } from "@/lib/i18n";

export default function SignOutButton() {
  const [pending, start] = useTransition();
  const t = useT();
  return (
    <button
      onClick={() => start(() => signOut())}
      disabled={pending}
      className="w-full rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? t("c.saving", "Signing out…") : t("settings.signOut", "Sign out")}
    </button>
  );
}
