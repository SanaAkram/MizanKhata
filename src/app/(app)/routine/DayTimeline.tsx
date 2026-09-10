"use client";

import { useEffect, useRef } from "react";
import { minutesNow } from "@/lib/date";
import { fmt12h } from "@/lib/format";
import { useT } from "@/lib/i18n";
import {
  CATEGORY_COLOR,
  type RoutineCategory,
} from "@/lib/routine/types";
import type { Occurrence } from "@/lib/routine/schedule";
import { CheckIcon } from "@/components/icons";

const PX_PER_MIN = 1; // 60px per hour
const GUTTER = 46; // px reserved for hour labels

type Lane = { occ: Occurrence; lane: number };

function assignLanes(occs: Occurrence[]): { lanes: Lane[]; count: number } {
  const laneEnds: number[] = [];
  const lanes: Lane[] = [];
  for (const occ of occs) {
    let lane = laneEnds.findIndex((end) => end <= occ.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(occ.endMin);
    } else {
      laneEnds[lane] = occ.endMin;
    }
    lanes.push({ occ, lane });
  }
  return { lanes, count: Math.max(1, laneEnds.length) };
}

export default function DayTimeline({
  occurrences,
  bounds,
  isToday,
  now,
  onPick,
}: {
  occurrences: Occurrence[];
  bounds: [number, number];
  isToday: boolean;
  now: Date;
  onPick: (occ: Occurrence) => void;
}) {
  const t = useT();
  const [loHour, hiHour] = bounds;
  const topMin = loHour * 60;
  const totalMin = (hiHour - loHour) * 60;
  const height = totalMin * PX_PER_MIN;
  const scrollRef = useRef<HTMLDivElement>(null);

  const { lanes, count } = assignLanes(occurrences);
  const nowMin = minutesNow(now);
  const nowVisible = isToday && nowMin >= topMin && nowMin <= hiHour * 60;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const focusMin = nowVisible
      ? nowMin
      : occurrences.length > 0
        ? occurrences[0].startMin
        : topMin;
    el.scrollTop = Math.max(0, (focusMin - topMin) * PX_PER_MIN - 90);
    // run once per day view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrences.length, bounds[0], bounds[1]]);

  const hours = Array.from({ length: hiHour - loHour + 1 }, (_, i) => loHour + i);

  return (
    <div
      ref={scrollRef}
      className="max-h-[62vh] overflow-y-auto rounded-2xl border border-line bg-card"
    >
      <div className="relative" style={{ height }}>
        {/* hour grid */}
        {hours.map((h) => {
          const top = (h * 60 - topMin) * PX_PER_MIN;
          return (
            <div
              key={h}
              className="absolute inset-x-0 border-t border-line/70"
              style={{ top }}
            >
              <span className="absolute -top-2 left-2 text-[10px] font-medium text-muted">
                {fmt12h(`${h % 24}:00`)}
              </span>
            </div>
          );
        })}

        {/* now line */}
        {nowVisible ? (
          <div
            className="absolute inset-x-0 z-20 flex items-center"
            style={{ top: (nowMin - topMin) * PX_PER_MIN }}
          >
            <span className="ml-[38px] h-2 w-2 -translate-x-1/2 rounded-full bg-danger" />
            <span className="h-px flex-1 bg-danger/70" />
          </div>
        ) : null}

        {/* occurrences */}
        {lanes.map(({ occ, lane }) => {
          const top = (occ.startMin - topMin) * PX_PER_MIN;
          const h = Math.max(
            (occ.endMin - occ.startMin) * PX_PER_MIN,
            34,
          );
          const laneW = `calc((100% - ${GUTTER}px) / ${count})`;
          const left = `calc(${GUTTER}px + (100% - ${GUTTER}px) / ${count} * ${lane})`;
          const cat = (occ.item.category as RoutineCategory) ?? "other";
          const vis =
            occ.status === "pending" && occ.phase === "active"
              ? "active"
              : occ.status;
          const s = statusStyle(vis);

          return (
            <button
              key={occ.item.id}
              onClick={() => onPick(occ)}
              className={`absolute z-10 overflow-hidden rounded-lg border px-2 py-1 text-left ${s.box}`}
              style={{
                top,
                height: h,
                left,
                width: laneW,
                borderLeftColor: CATEGORY_COLOR[cat],
                borderLeftWidth: 3,
              }}
            >
              <span
                className={`flex items-center gap-1 text-[12px] font-semibold leading-tight ${s.label}`}
              >
                {occ.status === "done" ? (
                  <CheckIcon className="h-3.5 w-3.5 shrink-0 text-ok" />
                ) : null}
                <span className="truncate">{occ.item.label}</span>
              </span>
              <span className="block text-[10px] text-muted">
                {fmt12h(occ.item.at_time)}
              </span>
            </button>
          );
        })}

        {occurrences.length === 0 ? (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-muted">
            {t("routine.nothingElse", "Nothing scheduled this day.")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type VisualState = Occurrence["status"] | "active";

function statusStyle(status: VisualState) {
  switch (status) {
    case "active":
      return { box: "border-gold/50 bg-gold/12 pulse", label: "text-ink" };
    case "done":
      return { box: "border-ok/40 bg-ok/10", label: "text-ink" };
    case "missed":
      return {
        box: "border-line bg-card opacity-60",
        label: "text-muted line-through decoration-danger/50",
      };
    case "skipped":
      return {
        box: "border-dashed border-line bg-card opacity-75",
        label: "text-muted italic",
      };
    default:
      return { box: "border-line bg-card", label: "text-ink" };
  }
}
