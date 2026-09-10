"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { normalizePhonePk } from "@/lib/validate";
import type { Profile } from "@/lib/auth/profile";

export default function ProfileSection({ profile }: { profile: Profile | null }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [type, setType] = useState<"business" | "personal">(
    profile?.account_type === "personal" ? "personal" : "business",
  );
  const [busy, setBusy] = useState(false);

  const cls =
    "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";

  async function save(nextType?: "business" | "personal") {
    if (!profile) return;
    const t = nextType ?? type;
    const ph = phone.trim() ? normalizePhonePk(phone) : null;
    if (phone.trim() && !ph) {
      toast("Enter a valid mobile number, e.g. 03001234567.", "error");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim() || null,
          phone: ph,
          account_type: t,
        })
        .eq("id", profile.id);
      if (error) throw error;
      // keep auth metadata roughly in sync
      await supabase.auth.updateUser({
        data: { full_name: name.trim(), phone: ph, account_type: t },
      });
      setType(t);
      toast("Saved.", "success");
      router.refresh();
    } catch {
      toast("Could not save. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        You
      </h2>

      <div className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cls}
            placeholder="Your name"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Mobile number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            className={cls}
            placeholder="03001234567"
          />
        </label>

        <div className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Account type
          <div className="flex gap-1 rounded-xl border border-line p-1">
            {(["business", "personal"] as const).map((tt) => (
              <button
                key={tt}
                onClick={() => void save(tt)}
                disabled={busy}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                  type === tt ? "bg-forest text-paper" : "text-muted"
                }`}
              >
                {tt === "business" ? "Shop" : "Personal"}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-normal">
            {type === "personal"
              ? "Ledger, Shop and Cash Book are hidden. Switch to Shop to use them."
              : "All features on."}
          </span>
        </div>

        <button
          onClick={() => void save()}
          disabled={busy}
          className="mt-1 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}
