"use client";

import { useState } from "react";
import {
  PRESET_LABELS,
  rangeFor,
  type DateRange,
  type RangePreset,
} from "@/lib/date-range";
import { useT } from "@/lib/i18n";

const PRESETS: RangePreset[] = [
  "all",
  "month",
  "lastmonth",
  "7d",
  "30d",
  "year",
  "custom",
];

/**
 * Compact date-range picker: a row of preset chips + custom from/to inputs.
 * Owns the preset state; calls `onChange` with a concrete {from,to} range.
 */
export default function DateRangeFilter({
  onChange,
}: {
  onChange: (r: DateRange) => void;
}) {
  const t = useT();
  const [preset, setPreset] = useState<RangePreset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function pick(p: RangePreset) {
    setPreset(p);
    onChange(rangeFor(p, from, to));
  }
  function setCustom(f: string, t: string) {
    setFrom(f);
    setTo(t);
    setPreset("custom");
    onChange(rangeFor("custom", f, t));
  }

  const cls =
    "rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest";

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => pick(p)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
              preset === p
                ? "border-forest bg-forest text-paper"
                : "border-line bg-card text-muted"
            }`}
          >
            {t(`range.${p}`, PRESET_LABELS[p])}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-muted">
            {t("range.hint", "first date to last date")}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setCustom(e.target.value, to)}
              className={`${cls} flex-1`}
              aria-label="From date"
            />
            <span className="text-xs text-muted">{t("range.to", "to")}</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setCustom(from, e.target.value)}
              className={`${cls} flex-1`}
              aria-label="To date"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
