"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { evalExpr } from "@/components/CalcField";

function BackspaceIcon() {
  return (
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
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function fmtMem(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const OP_KEYS = new Set(["%", "÷", "×", "−", "+", "="]);

/**
 * An always-on-screen calculator for an amount field — Digikhata's own
 * add-entry keypad, laid out the same way: AC / M+ / M- / ⌫ on top, the
 * usual digit + operator grid below, a tall "enter" key on the right (does
 * the same thing as the form's own Save button — a shortcut for finishing
 * entry right from the keypad), and a wide 0.
 *
 * M+ / M- match a standard calculator's memory keys: they add (or
 * subtract) whatever's on screen into a *hidden* memory register — not
 * the display — and then clear the display so the next number can be
 * typed fresh (e.g. price × qty, M+, next price × qty, M+, …, to tally
 * several lines before recalling the total). AC clears the display only;
 * memory is untouched by it, same as a real calculator, and only clears
 * on the × next to the memory readout. Tapping that readout recalls the
 * total into the field (like MR).
 */
export default function CalcKeypad({
  value,
  onChange,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
}) {
  const t = useT();
  const [mem, setMem] = useState(0);

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

  function memAdd(sign: 1 | -1) {
    const v = evalExpr(value) ?? Number(value) ?? 0;
    if (!v) return;
    setMem((m) => Math.round((m + sign * v) * 100) / 100);
    onChange(""); // ready for the next entry, same as a physical calculator
  }

  const keyCls = (active = false) =>
    `flex items-center justify-center rounded-xl py-3.5 text-lg font-semibold ${
      active ? "bg-line text-forest" : "border border-line bg-card text-ink"
    }`;

  return (
    <div className="flex flex-col gap-2">
      {mem !== 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-forest/30 bg-forest/5 px-3 py-2">
          <button
            type="button"
            onClick={() => onChange(String(mem))}
            className="flex-1 truncate text-left text-sm font-semibold text-forest"
          >
            M {mem > 0 ? "+" : ""}
            {fmtMem(mem)} · {t("calc.tapToUse", "tap to use")}
          </button>
          <button
            type="button"
            onClick={() => setMem(0)}
            aria-label={t("calc.clearMemory", "Clear memory")}
            className="shrink-0 text-muted"
          >
            <CloseIcon />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-2">
        <button type="button" onClick={() => onChange("")} className={keyCls()}>
          AC
        </button>
        <button type="button" onClick={() => memAdd(1)} className={keyCls()}>
          M+
        </button>
        <button type="button" onClick={() => memAdd(-1)} className={keyCls()}>
          M-
        </button>
        <button
          type="button"
          onClick={() => onChange(value.slice(0, -1))}
          aria-label="Backspace"
          className={keyCls()}
        >
          <BackspaceIcon />
        </button>

        {["%", "÷", "×", "−"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => tap(k)}
            className={keyCls(OP_KEYS.has(k))}
          >
            {k}
          </button>
        ))}

        {["7", "8", "9", "+"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => tap(k)}
            className={keyCls(OP_KEYS.has(k))}
          >
            {k}
          </button>
        ))}

        {["4", "5", "6", "="].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => tap(k)}
            className={keyCls(OP_KEYS.has(k))}
          >
            {k}
          </button>
        ))}

        {["1", "2", "3"].map((k) => (
          <button key={k} type="button" onClick={() => tap(k)} className={keyCls()}>
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={onEnter}
          className="row-span-2 flex items-center justify-center rounded-xl bg-forest text-paper active:opacity-90"
        >
          <ArrowIcon />
        </button>

        <button
          type="button"
          onClick={() => tap("0")}
          className={`${keyCls()} col-span-2`}
        >
          0
        </button>
        <button type="button" onClick={() => tap(".")} className={keyCls()}>
          .
        </button>
      </div>
    </div>
  );
}
