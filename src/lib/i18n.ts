"use client";

import { useSyncExternalStore } from "react";

export type Lang = "en" | "ur" | "roman";

export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: "en", label: "English", native: "English" },
  { id: "ur", label: "Urdu", native: "اردو" },
  { id: "roman", label: "Roman Urdu", native: "Roman Urdu" },
];

const KEY = "mizankhata:lang";

type Entry = Record<Lang, string>;

/**
 * Flat translation table. Keys are dotted ids. English is the source of truth
 * and the fallback when a translation is missing.
 */
const DICT: Record<string, Entry> = {
  // bottom nav
  "nav.work": { en: "Work", ur: "کام", roman: "Kaam" },
  "nav.routine": { en: "Routine", ur: "روٹین", roman: "Routine" },
  "nav.ledger": { en: "Ledger", ur: "کھاتہ", roman: "Khata" },
  "nav.shop": { en: "Shop", ur: "دکان", roman: "Dukaan" },

  // date range filter
  "range.all": { en: "All time", ur: "تمام وقت", roman: "Sara waqt" },
  "range.month": { en: "This month", ur: "اِس مہینے", roman: "Is mahine" },
  "range.lastmonth": { en: "Last month", ur: "پچھلے مہینے", roman: "Pichle mahine" },
  "range.7d": { en: "Last 7 days", ur: "پچھلے ۷ دن", roman: "Pichle 7 din" },
  "range.30d": { en: "Last 30 days", ur: "پچھلے ۳۰ دن", roman: "Pichle 30 din" },
  "range.year": { en: "This year", ur: "اِس سال", roman: "Is saal" },
  "range.custom": { en: "Custom", ur: "اپنی مرضی", roman: "Apni marzi" },
  "range.to": { en: "to", ur: "سے", roman: "se" },
  "range.hint": {
    en: "first date to last date",
    ur: "پہلی تاریخ سے آخری تاریخ تک",
    roman: "pehli date se aakhri date tak",
  },
  "range.entries": { en: "entries", ur: "اندراجات", roman: "entries" },
  "range.entry": { en: "entry", ur: "اندراج", roman: "entry" },
  "range.netForPeriod": {
    en: "Net for period",
    ur: "اِس مدت کا خالص",
    roman: "Is muddat ka net",
  },
  "range.noneInRange": {
    en: "Nothing in this date range.",
    ur: "اِس تاریخ کی حد میں کچھ نہیں۔",
    roman: "Is date range mein kuch nahi.",
  },

  // ledger
  "ledger.youllGet": { en: "You'll get", ur: "لینے ہیں", roman: "Lene hain" },
  "ledger.youllGive": { en: "You'll give", ur: "دینے ہیں", roman: "Dene hain" },
  "ledger.netPosition": {
    en: "Net position",
    ur: "مجموعی حیثیت",
    roman: "Majmoyi haisiyat",
  },
  "ledger.customersOweYou": {
    en: "Customers owe you",
    ur: "گاہکوں سے لینے ہیں",
    roman: "Customers se lene hain",
  },
  "ledger.youOweSuppliers": {
    en: "You owe suppliers",
    ur: "سپلائرز کو دینے ہیں",
    roman: "Suppliers ko dene hain",
  },
  "ledger.cashBankInHand": {
    en: "Cash & bank in hand",
    ur: "نقد و بینک",
    roman: "Cash o bank",
  },
  "ledger.net": { en: "Net", ur: "خالص", roman: "Net" },
  "ledger.all": { en: "All", ur: "سب", roman: "Sab" },
  "ledger.customers": { en: "Customers", ur: "گاہک", roman: "Customers" },
  "ledger.suppliers": { en: "Suppliers", ur: "سپلائرز", roman: "Suppliers" },
  "ledger.settled": { en: "Settled", ur: "برابر", roman: "Barabar" },

  // cash book
  "cash.in": { en: "Cash in", ur: "نقد آمد", roman: "Cash in" },
  "cash.out": { en: "Cash out", ur: "نقد خرچ", roman: "Cash out" },

  // settings
  "settings.language": { en: "Language", ur: "زبان", roman: "Zabaan" },
  "settings.languageHint": {
    en: "Changes labels across the app.",
    ur: "پوری ایپ کے لیبل بدل دیتا ہے۔",
    roman: "Poori app ke labels badal deta hai.",
  },
};

export function translate(lang: Lang, key: string, fallback?: string): string {
  const e = DICT[key];
  if (!e) return fallback ?? key;
  return e[lang] || e.en || fallback || key;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("mizankhata:lang", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("mizankhata:lang", cb);
    window.removeEventListener("storage", cb);
  };
}
function getSnapshot(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "ur" || v === "roman" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "en";
}
function getServerSnapshot(): Lang {
  return "en";
}

/** Current language, reactive. SSR-safe (renders as "en", re-syncs on mount). */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setLang(l: Lang): void {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mizankhata:lang"));
  }
}

/** `const t = useT(); t("nav.work")` */
export function useT(): (key: string, fallback?: string) => string {
  const lang = useLang();
  return (key: string, fallback?: string) => translate(lang, key, fallback);
}
