"use client";

import { useSyncExternalStore } from "react";
import {
  LANG_COOKIE,
  isLang,
  translate,
  type Lang,
} from "@/lib/i18n-dict";

export { LANGS, translate, type Lang } from "@/lib/i18n-dict";

const LS_KEY = "mizankhata:lang";
const EVENT = "mizankhata:lang";

function readLang(): Lang {
  try {
    const ls = localStorage.getItem(LS_KEY);
    if (isLang(ls)) return ls;
  } catch {
    /* ignore */
  }
  try {
    const m = document.cookie.match(
      new RegExp("(?:^|; )" + LANG_COOKIE + "=([^;]+)"),
    );
    if (m && isLang(m[1])) return m[1];
  } catch {
    /* ignore */
  }
  return "en";
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function getServerSnapshot(): Lang {
  return "en";
}

/** Current language, reactive. SSR-safe (renders "en", re-syncs after mount). */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, readLang, getServerSnapshot);
}

export function setLang(l: Lang): void {
  try {
    localStorage.setItem(LS_KEY, l);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    applyDir(l);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

/** Set <html dir/lang> for the chosen language (Urdu is RTL). */
export function applyDir(l: Lang): void {
  try {
    const el = document.documentElement;
    el.setAttribute("lang", l === "en" ? "en" : "ur");
    el.setAttribute("dir", l === "ur" ? "rtl" : "ltr");
  } catch {
    /* ignore */
  }
}

/** `const t = useT(); t("nav.work")` — optionally `t("key", "fallback", {n: 3})`. */
export function useT(): (
  key: string,
  fallback?: string,
  vars?: Record<string, string | number>,
) => string {
  const lang = useLang();
  return (key, fallback, vars) => translate(lang, key, fallback, vars);
}
