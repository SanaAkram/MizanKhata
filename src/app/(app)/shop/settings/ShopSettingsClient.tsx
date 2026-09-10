"use client";

import { toast } from "@/lib/toast";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createBusiness,
  deleteBusiness,
  saveBusiness,
  setActiveBusinessCookie,
  type Business,
} from "@/lib/khata/business";
import { useT } from "@/lib/i18n";
import Sheet from "@/components/Sheet";

export default function ShopSettingsClient({
  list,
  activeId,
  premium = false,
}: {
  list: Business[];
  activeId: string;
  premium?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();
  const active = list.find((b) => b.id === activeId) ?? list[0] ?? null;

  const [name, setName] = useState(active?.name ?? "");
  const [phone, setPhone] = useState(active?.phone ?? "");
  const [address, setAddress] = useState(active?.address ?? "");
  const [logoUrl, setLogoUrl] = useState(active?.logo_url ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newBizOpen, setNewBizOpen] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [creating, setCreating] = useState(false);
  const [armDelBiz, setArmDelBiz] = useState(false);
  const [deletingBiz, setDeletingBiz] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cls =
    "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";

  function switchTo(id: string) {
    if (id === activeId) return;
    setActiveBusinessCookie(id);
    router.refresh();
  }

  async function addBusiness() {
    if (!newBizName.trim() || creating) return;
    setCreating(true);
    try {
      const b = await createBusiness(supabase, newBizName.trim());
      if (b) {
        setActiveBusinessCookie(b.id);
        setNewBizOpen(false);
        setNewBizName("");
        router.push("/shop");
        router.refresh();
      }
    } catch {
      toast("Could not create the business.", "error");
    } finally {
      setCreating(false);
    }
  }

  async function removeBusiness() {
    if (!active || list.length < 2 || deletingBiz) return;
    setDeletingBiz(true);
    try {
      await deleteBusiness(supabase, active.id);
      const next = list.find((b) => b.id !== active.id);
      if (next) setActiveBusinessCookie(next.id);
      setArmDelBiz(false);
      toast("Business deleted.", "success");
      router.push("/shop");
      router.refresh();
    } catch {
      toast("Could not delete the business.", "error");
      setDeletingBiz(false);
    }
  }

  function dominantColor(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const s = 28;
          const cv = document.createElement("canvas");
          cv.width = s;
          cv.height = s;
          const ctx = cv.getContext("2d");
          if (!ctx) return resolve("#2f4a34");
          ctx.drawImage(img, 0, 0, s, s);
          const { data } = ctx.getImageData(0, 0, s, s);
          let r = 0,
            g = 0,
            b = 0,
            n = 0;
          for (let i = 0; i < data.length; i += 4) {
            const rr = data[i],
              gg = data[i + 1],
              bb = data[i + 2],
              aa = data[i + 3];
            if (aa < 128) continue;
            const mx = Math.max(rr, gg, bb);
            const mn = Math.min(rr, gg, bb);
            if (mx > 238 && mn > 238) continue; // near-white
            if (mx < 26) continue; // near-black
            r += rr;
            g += gg;
            b += bb;
            n++;
          }
          if (!n) return resolve("#2f4a34");
          const hx = (v: number) =>
            Math.round(v / n)
              .toString(16)
              .padStart(2, "0");
          resolve(`#${hx(r)}${hx(g)}${hx(b)}`);
        } catch {
          resolve("#2f4a34");
        }
      };
      img.onerror = () => resolve("#2f4a34");
      img.src = URL.createObjectURL(file);
    });
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
      const color = await dominantColor(file);
      await saveBusiness(supabase, active.id, {
        logo_url: url,
        logo_color: color,
      });
      setLogoUrl(url);
      router.refresh();
      toast("Logo saved — bills will use its colour.", "success");
    } catch {
      toast("Could not upload the logo.", "error");
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
      toast("Could not save. Try again.", "error");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/shop" className="text-sm text-muted">
        ‹ {t("nav.shop", "Shop")}
      </Link>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("shopset.business", "Business")}
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
              {b.id === activeId ? (
                <span className="text-xs">{t("shopset.active", "active")}</span>
              ) : null}
            </button>
          ))}
          <button
            onClick={() => setNewBizOpen(true)}
            className="rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-semibold text-muted"
          >
            {t("shopset.newBusiness", "+ New business")}
          </button>
          {list.length > 1 ? (
            <button
              onClick={() => {
                if (!armDelBiz) {
                  setArmDelBiz(true);
                  setTimeout(() => setArmDelBiz(false), 3000);
                  return;
                }
                void removeBusiness();
              }}
              disabled={deletingBiz}
              className="mt-1 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-xs font-semibold text-danger disabled:opacity-50"
            >
              {armDelBiz
                ? t(
                    "shopset.deleteBusinessArm",
                    "Tap again — deletes “{name}” and all its data",
                    { name: active?.name ?? "" },
                  )
                : t("shopset.deleteBusiness", "Delete this business")}
            </button>
          ) : null}
        </div>
      </section>

      <Sheet
        open={newBizOpen}
        title={t("shopset.newBusinessTitle", "New business")}
        onClose={() => setNewBizOpen(false)}
      >
        <div className="flex flex-col gap-3">
          <input
            value={newBizName}
            onChange={(e) => setNewBizName(e.target.value)}
            placeholder={t("shopset.businessName", "Business name")}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") void addBusiness();
            }}
            className={cls}
          />
          <button
            onClick={addBusiness}
            disabled={!newBizName.trim() || creating}
            className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
          >
            {creating
              ? t("c.saving", "Creating…")
              : t("shopset.createBusiness", "Create business")}
          </button>
        </div>
      </Sheet>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("shopset.profile", "Profile — shows on bills")}
        </h2>

        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-card">
            {premium && logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="logo"
                className="h-full w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/icon.svg"
                alt="MizanKhata"
                className="h-10 w-10 object-contain"
              />
            )}
          </div>
          {premium ? (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-forest disabled:opacity-50"
              >
                {uploading
                  ? t("c.saving", "Uploading…")
                  : logoUrl
                    ? t("shopset.changeLogo", "Change logo")
                    : t("shopset.uploadLogo", "Upload logo")}
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
            </>
          ) : (
            <p className="text-xs text-muted">
              {t(
                "shopset.logoPremium",
                "Bills show the MizanKhata logo. Upgrade to Premium to put your own logo on bills.",
              )}
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          {t("shopset.businessName", "Business name")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Market"
            className={cls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          {t("shopset.phone", "Phone")}
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="03001234567"
            inputMode="tel"
            className={cls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          {t("shopset.address", "Address")}
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("shopset.shopAddress", "Shop address")}
            rows={2}
            className={`${cls} resize-none`}
          />
        </label>
        <button
          onClick={save}
          disabled={busy}
          className="mt-1 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {busy ? t("c.saving", "Saving…") : t("c.save", "Save")}
        </button>
      </section>
    </div>
  );
}
