"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * A full-viewport overlay with a page-style header (back arrow + title),
 * for content that deserves real room instead of a bottom sheet — e.g. an
 * entry's detail or its add/edit form, which get cramped stacked under a
 * calculator sheet in a half-height Sheet.
 */
export default function FullPage({
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-paper"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <button
          onClick={onClose}
          aria-label="Back"
          className="-ml-1.5 shrink-0 rounded-lg p-1.5 text-ink active:bg-line"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="truncate text-base font-semibold text-ink">
          {title ?? ""}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>,
    document.body,
  );
}
