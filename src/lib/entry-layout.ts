"use client";

import { useSyncExternalStore } from "react";

/**
 * App-wide preference for how money-movement lists are shown:
 *  - "columns" = Digikhata-style two columns (money out on the left / red,
 *    money in on the right / green)
 *  - "list"    = one row per entry with a signed, coloured amount
 *
 * Used by the ledger party detail, Cash Book, Expense and the reports.
 * Stored per device; changing it updates every open list at once.
 */
export type EntryLayout = "columns" | "list";

const LS_KEY = "mizankhata:entry-layout";
const EVENT = "mizankhata:entry-layout";
const DEFAULT: EntryLayout = "columns";

function isLayout(v: unknown): v is EntryLayout {
  return v === "columns" || v === "list";
}

function read(): EntryLayout {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (isLayout(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT;
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

function getServerSnapshot(): EntryLayout {
  return DEFAULT;
}

/** Current layout, reactive. SSR-safe (renders the default, re-syncs on mount). */
export function useEntryLayout(): EntryLayout {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

export function setEntryLayout(l: EntryLayout): void {
  try {
    localStorage.setItem(LS_KEY, l);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}
