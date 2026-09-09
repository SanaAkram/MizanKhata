"use client";

import { useEffect, useState } from "react";
import type { ToastKind } from "@/lib/toast";

type Item = { id: number; message: string; kind: ToastKind };

let seq = 0;

export default function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const d = (e as CustomEvent<{ message: string; kind: ToastKind }>).detail;
      if (!d?.message) return;
      const id = ++seq;
      setItems((cur) => [...cur, { id, message: d.message, kind: d.kind }]);
      window.setTimeout(() => {
        setItems((cur) => cur.filter((x) => x.id !== id));
      }, 3600);
    }
    window.addEventListener("mk:toast", onToast);
    return () => window.removeEventListener("mk:toast", onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] mx-auto flex max-w-[480px] flex-col items-center gap-2 px-5">
      {items.map((it) => (
        <div
          key={it.id}
          className={`pointer-events-auto w-full rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            it.kind === "error"
              ? "bg-danger text-paper"
              : it.kind === "success"
                ? "bg-ok text-paper"
                : "bg-forest-deep text-paper"
          }`}
          role="status"
        >
          {it.message}
        </div>
      ))}
    </div>
  );
}
