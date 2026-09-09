"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveProfile, type ShopProfile } from "@/lib/khata/profile";

export default function ShopSettingsClient({
  profile,
}: {
  profile: ShopProfile | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [name, setName] = useState(profile?.shop_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [busy, setBusy] = useState(false);

  const cls =
    "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";

  async function save() {
    setBusy(true);
    try {
      await saveProfile(supabase, {
        shop_name: name,
        phone: phone || null,
        address: address || null,
      });
      router.push("/shop");
      router.refresh();
    } catch {
      alert("Could not save. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Link href="/shop" className="text-sm text-muted">
        ‹ Shop
      </Link>
      <p className="text-xs text-muted">
        Shows on printed bills and PDF receipts.
      </p>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Shop name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Market"
          className={cls}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Phone
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03001234567"
          inputMode="tel"
          className={cls}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Address
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Shop address"
          rows={2}
          className={`${cls} resize-none`}
        />
      </label>
      <button
        onClick={save}
        disabled={busy}
        className="mt-1 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
