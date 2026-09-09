"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createBusiness,
  saveBusiness,
  setActiveBusinessCookie,
  type Business,
} from "@/lib/khata/business";

export default function ShopSettingsClient({
  list,
  activeId,
}: {
  list: Business[];
  activeId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const active = list.find((b) => b.id === activeId) ?? list[0] ?? null;

  const [name, setName] = useState(active?.name ?? "");
  const [phone, setPhone] = useState(active?.phone ?? "");
  const [address, setAddress] = useState(active?.address ?? "");
  const [logoUrl, setLogoUrl] = useState(active?.logo_url ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cls =
    "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";

  function switchTo(id: string) {
    if (id === activeId) return;
    setActiveBusinessCookie(id);
    router.refresh();
  }

  async function addBusiness() {
    const nm = prompt("New business name?");
    if (!nm) return;
    const b = await createBusiness(supabase, nm);
    if (b) {
      setActiveBusinessCookie(b.id);
      router.refresh();
    }
  }

  async function onLogo(file: File) {
    if (!active) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${active.id}/logo.${ext}`;
      const up = await supabase.storage
        .from("business-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data } = supabase.storage
        .from("business-logos")
        .getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      await saveBusiness(supabase, active.id, { logo_url: url });
      setLogoUrl(url);
      router.refresh();
    } catch {
      alert("Could not upload the logo.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!active) return;
    setBusy(true);
    try {
      await saveBusiness(supabase, active.id, {
        name: name.trim() || "My Shop",
        phone: phone.trim() || null,
        address: address.trim() || null,
      });
      router.push("/shop");
      router.refresh();
    } catch {
      alert("Could not save. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/shop" className="text-sm text-muted">
        ‹ Shop
      </Link>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Business
        </h2>
        <div className="flex flex-col gap-1.5">
          {list.map((b) => (
            <button
              key={b.id}
              onClick={() => switchTo(b.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm ${
                b.id === activeId
                  ? "border-forest bg-forest/5 font-semibold text-forest"
                  : "border-line text-ink"
              }`}
            >
              <span>{b.name}</span>
              {b.id === activeId ? <span className="text-xs">active</span> : null}
            </button>
          ))}
          <button
            onClick={addBusiness}
            className="rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-semibold text-muted"
          >
            + New business
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Profile — shows on bills
        </h2>

        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-card">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="logo"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted">No logo</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-forest disabled:opacity-50"
          >
            {uploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onLogo(f);
              e.target.value = "";
            }}
          />
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Business name
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
      </section>
    </div>
  );
}
