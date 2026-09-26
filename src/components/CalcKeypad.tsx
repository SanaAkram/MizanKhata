"use client";

import { useState } from "react";
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

const OP_KEYS = new Set(["%", "÷", "×", "−", "+", "="]);

/**
 * An always-on-screen calculator for an amount field — Digikhata's own
 * add-entry keypad, laid out the same way: AC / M+ / M- / ⌫ on top, the
 * usual digit + operator grid below, a tall "enter" key on the right (does
 * the same thing as the form's own Save button — a shortcut for finishing
 * entry right from the keypad), and a wide 0.
 *
 * M+ / M- keep a running total: they add (or subtract) whatever's on
 * screen into a memory register and immediately show the new running
 * total, so pressing M+ after each number tallies them without a separate
 * recall key.
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
    const v = evalExpr(value) ?? 0;
    const next = Math.round((mem + sign * v) * 10000) / 10000;
    setMem(next);
    onChange(String(next));
  }

  function clearAll() {
    setMem(0);
    onChange("");
  }

  const keyCls = (active = false) =>
    `flex items-center justify-center rounded-xl py-3.5 text-lg font-semibold ${
      active ? "bg-line text-forest" : "border border-line bg-card text-ink"
    }`;

  return (
    <div className="grid grid-cols-4 gap-2">
      <button type="button" onClick={clearAll} className={keyCls()}>
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
  );
}
