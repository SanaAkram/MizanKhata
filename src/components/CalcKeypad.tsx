"use client";

import { evalExpr } from "@/components/CalcField";

const KEYS = [
  "7",
  "8",
  "9",
  "÷",
  "4",
  "5",
  "6",
  "×",
  "1",
  "2",
  "3",
  "−",
  "0",
  ".",
  "=",
  "+",
];

/**
 * An always-visible calculator, pinned at the bottom of a full-page entry
 * form (Digikhata's own add-entry screen keeps its keypad on screen the
 * whole time, rather than behind a tap-to-open popup) — every key press
 * writes straight through `onChange`, live.
 */
export default function CalcKeypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  function tap(k: string) {
    if (k === "=") {
      const r = evalExpr(value);
      if (r != null) onChange(String(r));
      return;
    }
    onChange(
      value + (k === "−" ? "-" : k === "×" ? "*" : k === "÷" ? "/" : k),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex-1 rounded-xl border border-line bg-card py-3 text-sm font-semibold text-danger active:bg-line"
        >
          AC
        </button>
        <button
          type="button"
          onClick={() => onChange(value.slice(0, -1))}
          aria-label="Backspace"
          className="flex flex-1 items-center justify-center rounded-xl border border-line bg-card py-3 text-muted active:bg-line"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6 3 12l6 6h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H9Z" />
            <path d="m12 9 4 6M16 9l-4 6" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => tap(k)}
            className={`rounded-xl py-3.5 text-lg font-semibold ${
              ["÷", "×", "−", "+", "="].includes(k)
                ? "bg-line text-forest"
                : "border border-line bg-card text-ink"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
