"use client";

import { useEffect, useState } from "react";
import { CalcIcon } from "@/components/icons";

/** Evaluate a simple + - × ÷ ( ) expression. Returns null if invalid. */
export function evalExpr(raw: string): number | null {
  const src = raw
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[^0-9.+\-*/() ]/g, "");
  const toks = src.match(/\d+\.?\d*|[+\-*/()]/g);
  if (!toks || toks.length === 0) return null;
  const out: (number | string)[] = [];
  const ops: string[] = [];
  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  for (const t of toks) {
    if (/^\d/.test(t)) out.push(parseFloat(t));
    else if (t === "(") ops.push(t);
    else if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop()!);
      ops.pop();
    } else {
      while (
        ops.length &&
        ops[ops.length - 1] !== "(" &&
        prec[ops[ops.length - 1]] >= prec[t]
      )
        out.push(ops.pop()!);
      ops.push(t);
    }
  }
  while (ops.length) out.push(ops.pop()!);
  const st: number[] = [];
  for (const t of out) {
    if (typeof t === "number") st.push(t);
    else {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) return null;
      st.push(
        t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : a / b,
      );
    }
  }
  const r = st.pop();
  return r == null || !isFinite(r) ? null : Math.round(r * 10000) / 10000;
}

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

export default function CalcField({
  value,
  onChange,
  placeholder,
  className = "",
  big = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  big?: boolean;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function tap(k: string) {
    if (k === "=") {
      const r = evalExpr(expr);
      if (r != null) setExpr(String(r));
      return;
    }
    setExpr((e) => e + (k === "−" ? "-" : k === "×" ? "*" : k === "÷" ? "/" : k));
  }

  function commit() {
    const r = evalExpr(expr);
    onChange(r != null ? String(r) : expr.replace(/[*x×]/g, "").trim());
    setOpen(false);
  }

  const preview = evalExpr(expr);

  return (
    <>
      <div className="flex items-stretch gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="decimal"
          autoFocus={autoFocus}
          className={
            className ||
            `flex-1 rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:border-forest ${
              big ? "numeric text-2xl font-semibold" : "text-sm"
            }`
          }
        />
        <button
          type="button"
          onClick={() => {
            setExpr(value || "");
            setOpen(true);
          }}
          aria-label="Calculator"
          className="shrink-0 rounded-xl border border-line bg-card px-3 text-muted active:bg-line"
        >
          <CalcIcon className="h-5 w-5" />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-forest-deep/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-[480px] rounded-t-3xl border border-line bg-paper p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-2 rounded-xl border border-line bg-card px-4 py-3 text-right">
              <div className="numeric truncate text-lg text-ink">
                {expr || "0"}
              </div>
              <div className="numeric text-xs text-muted">
                {preview != null ? `= ${preview}` : " "}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => tap(k)}
                  className={`rounded-xl py-3 text-lg font-semibold ${
                    ["÷", "×", "−", "+", "="].includes(k)
                      ? "bg-line text-forest"
                      : "border border-line bg-card text-ink"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setExpr("")}
                className="rounded-xl border border-line bg-card py-3 text-sm font-semibold text-danger"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => setExpr((e) => e.slice(0, -1))}
                aria-label="Backspace"
                className="flex items-center justify-center rounded-xl border border-line bg-card py-3 text-sm font-semibold text-muted"
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
              <button
                type="button"
                onClick={commit}
                className="col-span-2 rounded-xl bg-forest py-3 text-sm font-semibold text-paper"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
