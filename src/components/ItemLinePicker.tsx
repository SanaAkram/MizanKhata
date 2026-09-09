"use client";

import { useState } from "react";
import Sheet from "@/components/Sheet";
import { fmtRs } from "@/lib/format";
import type { Product } from "@/lib/khata/shop-db";

export type ItemLine = {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  rate: number;
};

export function linesToText(lines: ItemLine[]): string {
  return lines.map((l) => `${l.qty} ${l.name} ${l.rate}Rs`).join("\n");
}

export function linesTotal(lines: ItemLine[]): number {
  return (
    Math.round(lines.reduce((s, l) => s + l.qty * l.rate, 0) * 100) / 100
  );
}

export default function ItemLinePicker({
  open,
  products,
  onClose,
  onDone,
  rateFrom = "sale",
}: {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onDone: (lines: ItemLine[]) => void;
  rateFrom?: "sale" | "purchase";
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<string, ItemLine>>({});

  const shown = products.filter(
    (p) => !q || p.name.toLowerCase().includes(q.toLowerCase()),
  );
  const chosen = Object.values(sel);
  const total = linesTotal(chosen);

  function toggle(p: Product) {
    setSel((s) => {
      const next = { ...s };
      if (next[p.id]) delete next[p.id];
      else
        next[p.id] = {
          productId: p.id,
          name: p.name,
          unit: p.unit,
          qty: 1,
          rate:
            Number(
              rateFrom === "purchase" ? p.purchase_price : p.sale_price,
            ) || 0,
        };
      return next;
    });
  }

  function patch(id: string, k: "qty" | "rate", v: number) {
    setSel((s) => (s[id] ? { ...s, [id]: { ...s[id], [k]: v } } : s));
  }

  return (
    <Sheet open={open} title="Add items" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products"
          className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
        />
        <ul className="flex max-h-[46vh] flex-col gap-1 overflow-y-auto">
          {shown.map((p) => {
            const line = sel[p.id];
            return (
              <li
                key={p.id}
                className="rounded-lg border border-line px-3 py-2"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!line}
                    onChange={() => toggle(p)}
                  />
                  <span className="flex-1 truncate text-ink">{p.name}</span>
                  <span className="text-[11px] text-muted">
                    Stock {Math.round(Number(p.stock))} {p.unit}
                  </span>
                </label>
                {line ? (
                  <div className="mt-1.5 flex items-center gap-2 pl-6">
                    <input
                      inputMode="decimal"
                      value={line.qty}
                      onChange={(e) =>
                        patch(p.id, "qty", Number(e.target.value) || 0)
                      }
                      className="w-16 rounded border border-line bg-paper px-2 py-1 text-sm"
                      placeholder="Qty"
                    />
                    <span className="text-xs text-muted">×</span>
                    <input
                      inputMode="decimal"
                      value={line.rate}
                      onChange={(e) =>
                        patch(p.id, "rate", Number(e.target.value) || 0)
                      }
                      className="w-20 rounded border border-line bg-paper px-2 py-1 text-sm"
                      placeholder="Rate"
                    />
                    <span className="numeric ml-auto text-xs font-semibold text-forest">
                      {fmtRs(line.qty * line.rate)}
                    </span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-line pt-2">
          <span className="numeric text-sm font-semibold">{fmtRs(total)}</span>
          <button
            onClick={() => {
              onDone(chosen);
              setSel({});
              setQ("");
            }}
            disabled={chosen.length === 0}
            className="rounded-xl bg-forest px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
          >
            Add {chosen.length || ""} item{chosen.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
