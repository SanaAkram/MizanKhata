"use client";

import { useEntryLayout, setEntryLayout } from "@/lib/entry-layout";
import { useT } from "@/lib/i18n";

/**
 * Segmented control for the app-wide entry layout (two columns / list).
 * Drop it above any money-movement list or in settings — they all read the
 * same preference, so flipping it here flips every list.
 */
export default function LayoutToggle({
  className = "",
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const layout = useEntryLayout();
  const t = useT();

  return (
    <div
      className={`flex items-center gap-1 text-[11px] font-semibold text-muted ${className}`}
    >
      {showLabel ? <span>{t("layout.view", "View")}</span> : null}
      {(["columns", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setEntryLayout(v)}
          aria-pressed={layout === v}
          className={`rounded-md px-2 py-1 ${
            layout === v ? "bg-forest text-paper" : "border border-line"
          }`}
        >
          {v === "columns"
            ? t("layout.columns", "Two columns")
            : t("layout.list", "List")}
        </button>
      ))}
    </div>
  );
}
