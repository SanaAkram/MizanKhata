"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js once on mount. The service worker is intentionally minimal
 * for now — it exists so notification actions work and so real background
 * push can be layered on later without restructuring.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore registration failures (e.g. private mode) */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
