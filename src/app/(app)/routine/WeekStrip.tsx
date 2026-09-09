"use client";

import { addDays, dateKey } from "@/lib/date";

type Adh = { done: number; total: number };

export default function WeekStrip({
  weekStart,
  selectedKey,
  todayKey,
  adherence,
  onSelect,
  onShift,
}: {
  weekStart: Date;
  selectedKey: string;
  todayKey: string;
  adherence: Map<string, Adh>;
  onSelect: (key: string) => void;
  onShift: (delta: number) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthLabel = weekStart.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          onClick={() => onShift(-1)}
          aria-label="Previous week"
          className="rounded-lg px-2 py-1 text-muted active:bg-line"
        >
          ‹
        </button>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {monthLabel}
        </span>
        <button
          onClick={() => onShift(1)}
          aria-label="Next week"
          className="rounded-lg px-2 py-1 text-muted active:bg-line"
        >
          ›
        </button>
      </div>

      <div className="flex gap-1">
        {days.map((d) => {
          const key = dateKey(d);
          const isSel = key === selectedKey;
          const isToday = key === todayKey;
          const a = adherence.get(key);
          const ratio = a && a.total > 0 ? a.done / a.total : -1;
          const dot =
            ratio < 0
              ? "bg-transparent"
              : ratio === 1
                ? "bg-ok"
                : ratio === 0
                  ? "bg-line"
                  : "bg-gold";

          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-center transition ${
                isSel ? "bg-forest text-paper" : "text-ink active:bg-line"
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase ${
                  isSel ? "text-paper/70" : "text-muted"
                }`}
              >
                {d.toLocaleDateString([], { weekday: "short" }).slice(0, 2)}
              </span>
              <span
                className={`numeric text-sm font-semibold ${
                  isToday && !isSel ? "text-forest" : ""
                }`}
              >
                {d.getDate()}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
