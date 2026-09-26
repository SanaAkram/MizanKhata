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

type MemLine = { expr: string; value: number; sign: 1 | -1 };

const OP_KEYS = new Set(["%", "÷", "×", "−", "+", "="]);

/**
 * An always-on-screen calculator for an amount field — Digikhata's own
 * add-entry keypad, laid out the same way: AC / M+ / M- / ⌫ on top, the
 * usual digit + operator grid below, a tall "enter" key on the right (does
 * the same thing as the form's own Save button — a shortcut for finishing
 * entry right from the keypad), and a wide 0.
 *
 * M+ / M- tally up a running total across several calculations (price ×
 * qty, M+, next price × qty, M+, …). Each one is kept as its own line
 * (the expression as typed, e.g. "100*20") so the shopkeeper can see what
 * was added, not just a final number — and the running total is written
 * straight into the field itself, so it's already the amount Save will
 * use with no separate recall step. Typing a fresh digit right after M+/M-
 * starts a new number instead of appending to that total (like a normal
 * calculator starting over after a result); typing an operator instead
 * keeps building on it. AC clears the field only, never the memory lines
 * — only the × next to them does that.
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
  const [memLines, setMemLines] = useState<MemLine[]>([]);
  const [freshStart, setFreshStart] = useState(false);
  const mem =
    Math.round(memLines.reduce((s, l) => s + l.sign * l.value, 0) * 100) / 100;

  function tap(k: string) {
    if (k === "=") {
      const r = evalExpr(value);
      if (r != null) onChange(String(r));
      setFreshStart(true);
      return;
    }
    const isDigit = k === "." || (k >= "0" && k <= "9");
    onChange(
      (freshStart && isDigit ? "" : value) +
        (k === "−" ? "-" : k === "×" ? "*" : k === "÷" ? "/" : k),
    );
    setFreshStart(false);
  }

  function memAdd(sign: 1 | -1) {
    const v = evalExpr(value) ?? Number(value) ?? 0;
    if (!v) return;
    const lines = [...memLines, { expr: value, value: v, sign }];
    const total = Math.round(lines.reduce((s, l) => s + l.sign * l.value, 0) * 100) / 100;
    setMemLines(lines);
    onChange(String(total)); // the running total is the amount, ready to save
    setFreshStart(true); // next digit starts the next line fresh
  }

  const keyCls = (active = false) =>
    `flex items-center justify-center rounded-xl py-3.5 text-lg font-semibold ${
      active ? "bg-line text-forest" : "border border-line bg-card text-ink"
    }`;

  return (
    <div className="flex flex-col gap-2">
      {memLines.length > 0 ? (
        <div className="flex items-start gap-2 px-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-muted">
              {t("calc.total", "Total")}: {fmtMem(mem)}
            </p>
            <div className="mt-0.5 flex max-h-20 flex-col gap-0.5 overflow-y-auto">
              {memLines.map((l, i) => (
                <p key={i} className="truncate text-xs text-muted">
                  ({l.sign > 0 ? "M" : "M-"}) {l.expr}
                </p>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMemLines([])}
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
