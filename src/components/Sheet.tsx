"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

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

  if (!open || typeof document === "undefined") return null;

  // Portal to <body> so the fixed overlay is truly viewport-anchored and
  // never trapped inside a scrolling container.
  return createPortal(
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
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-[480px] flex-col rounded-t-3xl border border-line bg-paper shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h3 className="text-base font-semibold text-ink">{title ?? ""}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-muted active:bg-line"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
