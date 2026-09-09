"use client";

import { useTransition } from "react";
import { signOut } from "@/app/login/actions";

export default function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => signOut())}
      disabled={pending}
      className="w-full rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
