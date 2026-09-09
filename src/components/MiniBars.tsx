import { fmtRs } from "@/lib/format";

export type BarPoint = { label: string; income: number; expense: number };

/**
 * Dependency-free paired bar chart (income vs expense) rendered as inline SVG.
 * Server-renderable — no client JS.
 */
export default function MiniBars({ data }: { data: BarPoint[] }) {
  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.income, d.expense)),
  );
  const W = 320;
  const H = 120;
  const pad = 4;
  const groupW = (W - pad * 2) / data.length;
  const barW = Math.min(14, groupW / 2 - 3);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H + 18}`}
        className="w-full"
        role="img"
        aria-label="Income and expense by month"
      >
        {data.map((d, i) => {
          const x0 = pad + i * groupW + groupW / 2;
          const ih = (d.income / max) * H;
          const eh = (d.expense / max) * H;
          return (
            <g key={d.label}>
              <rect
                x={x0 - barW - 1}
                y={H - ih}
                width={barW}
                height={ih}
                rx={2}
                fill="var(--forest)"
              />
              <rect
                x={x0 + 1}
                y={H - eh}
                width={barW}
                height={eh}
                rx={2}
                fill="var(--gold)"
              />
              <text
                x={x0}
                y={H + 13}
                textAnchor="middle"
                fontSize="9"
                fill="var(--muted)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-forest" /> Income
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-gold" /> Expense
        </span>
      </div>
    </div>
  );
}

export function ShareBars({
  items,
  tone,
}: {
  items: { name: string; amount: number }[];
  tone: "ok" | "danger";
}) {
  const total = items.reduce((s, x) => s + x.amount, 0) || 1;
  const top = items.slice(0, 4);
  const rest = items.slice(4);
  const restSum = rest.reduce((s, x) => s + x.amount, 0);
  const rows =
    restSum > 0
      ? [...top, { name: `Other (${rest.length})`, amount: restSum }]
      : top;

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => {
        const pct = Math.round((r.amount / total) * 100);
        return (
          <li key={r.name}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-ink">{r.name}</span>
              <span className="numeric shrink-0 text-muted">
                {fmtRs(r.amount)} · {pct}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full ${
                  tone === "ok" ? "bg-ok" : "bg-danger"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
