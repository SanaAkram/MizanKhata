"use client";

import { useEffect } from "react";
import { applyDir, useLang } from "@/lib/i18n";

/** Keeps <html lang/dir> in sync with the chosen language (no reload needed). */
export default function HtmlLang() {
  const lang = useLang();
  useEffect(() => {
    applyDir(lang);
  }, [lang]);
  return null;
}
