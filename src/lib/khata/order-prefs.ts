"use client";

import { useSyncExternalStore } from "react";

/**
 * Per-device thresholds for the Order Book:
 *  - soonDays: how many days before the due date an order is flagged "due soon"
 *  - graceDays: how many days AFTER the due date before it's flagged "overdue"
 *    (0 = overdue on the due date itself)
 */
export type OrderPrefs = { soonDays: number; graceDays: number };

export const SOON_OPTIONS = [1, 2, 3, 5, 7];
export const GRACE_OPTIONS = [0, 1, 3, 7, 14];

const DEFAULT: OrderPrefs = { soonDays: 2, graceDays: 0 };
const LS_KEY = "mizankhata:order-prefs";
const EVENT = "mizankhata:order-prefs";

function read(): OrderPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<OrderPrefs>;
      return {
        soonDays: SOON_OPTIONS.includes(Number(v.soonDays))
          ? Number(v.soonDays)
          : DEFAULT.soonDays,
        graceDays: GRACE_OPTIONS.includes(Number(v.graceDays))
          ? Number(v.graceDays)
          : DEFAULT.graceDays,
      };
    }
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

let cache: OrderPrefs = DEFAULT;
let cacheKey = "";
function getSnapshot(): OrderPrefs {
  const next = read();
  const key = `${next.soonDays}:${next.graceDays}`;
  if (key !== cacheKey) {
    cache = next;
    cacheKey = key;
  }
  return cache;
}

export function useOrderPrefs(): OrderPrefs {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT);
}

export function setOrderPrefs(p: OrderPrefs): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}
