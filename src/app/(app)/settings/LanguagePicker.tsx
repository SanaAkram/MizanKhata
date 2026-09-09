"use client";

import { LANGS, setLang, useLang, useT } from "@/lib/i18n";

export default function LanguagePicker() {
  const lang = useLang();
  const t = useT();

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {t("settings.language")}
      </h2>
      <div className="mt-3 flex flex-col gap-1.5">
        {LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLang(l.id)}
            className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm ${
              lang === l.id
                ? "border-forest bg-forest/5 font-semibold text-forest"
                : "border-line text-ink"
            }`}
          >
            <span>{l.label}</span>
            <span className="text-muted">{l.native}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">{t("settings.languageHint")}</p>
    </section>
  );
}
