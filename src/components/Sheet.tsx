"use client";

import { useEffect } from "react";

export default function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-forest-deep/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-[480px] rounded-t-3xl border border-line bg-paper p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        {title ? (
          <h3 className="mb-3 text-base font-semibold text-ink">{title}</h3>
        ) : null}
        {children}
      </div>
    </div>
  );
}
