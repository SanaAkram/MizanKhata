"use client";

import { fmt12h, fmtDuration, fmtTimeOfDay } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { Occurrence } from "@/lib/routine/schedule";
import type { RoutineStatus } from "@/lib/routine/types";

export default function DueNowCard({
  active,
  next,
  catchUp,
  now,
  onMark,
  onSnooze,
}: {
  active: Occurrence | null;
  next: Occurrence | null;
  catchUp: Occurrence[];
  now: Date;
  onMark: (itemId: string, status: RoutineStatus) => void;
  onSnooze: (itemId: string) => void;
}) {
  const t = useT();
  if (catchUp.length > 0) {
    return (
      <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">
          {t("routine.checkIn", "Check in")}
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {catchUp.map((o) => {
            const prayer = o.item.category === "prayer";
            return (
              <li key={o.item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {prayer
                      ? t("routine.didYouPray", "Did you offer {label} prayer?", {
                          label: o.item.label,
                        })
                      : t("routine.doneQ", "{label} — done?", {
                          label: o.item.label,
                        })}
                  </p>
                  <p className="text-xs text-muted">
                    {fmt12h(o.item.at_time)}
                    <button
                      onClick={() => onSnooze(o.item.id)}
                      className="ml-2 font-semibold text-gold underline underline-offset-2"
                    >
                      {t("routine.later", "Later")}
                    </button>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => onMark(o.item.id, "done")}
                    className="rounded-lg bg-forest px-3 py-2 text-xs font-semibold text-paper"
                  >
                    {t("routine.yes", "Yes")}
                  </button>
                  <button
                    onClick={() => onMark(o.item.id, "missed")}
                    className="rounded-lg border border-line bg-card px-3 py-2 text-xs font-semibold text-muted"
                  >
                    {t("routine.no", "No")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (active) {
    return (
      <div className="rounded-2xl border border-gold/50 bg-gold/12 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">
          {t("routine.now", "Now")}
        </p>
        <p className="numeric mt-1 text-2xl font-semibold text-ink">
          {active.item.label}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {fmt12h(active.item.at_time)} ·{" "}
          {t("routine.windowUntil", "window until {t}", {
            t: fmtTimeOfDay(active.end),
          })}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onMark(active.item.id, "done")}
            className="flex-1 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper active:scale-[0.99]"
          >
            {t("routine.markDone", "Mark done")}
          </button>
          <button
            onClick={() => onSnooze(active.item.id)}
            className="rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-muted"
          >
            {t("routine.snooze15", "Snooze 15m")}
          </button>
          <button
            onClick={() => onMark(active.item.id, "skipped")}
            className="rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-muted"
          >
            {t("routine.skip", "Skip")}
          </button>
        </div>
      </div>
    );
  }

  if (next) {
    const ms = next.start.getTime() - now.getTime();
    const prayer = next.item.category === "prayer";
    return (
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("routine.upNext", "Up next")}
        </p>
        <p className="mt-1 text-lg font-semibold text-ink">{next.item.label}</p>
        <p className="mt-0.5 text-xs text-muted">
          {fmt12h(next.item.at_time)}
          {ms > 0
            ? ` · ${t("routine.inTime", "in {d}", { d: fmtDuration(ms) })}`
            : ""}
        </p>
        {prayer ? (
          <p className="mt-3 text-xs text-muted">
            {t(
              "routine.prayerLogWhen",
              "Can be logged once the prayer time begins.",
            )}
          </p>
        ) : (
          <button
            onClick={() => onMark(next.item.id, "done")}
            className="mt-3 text-xs font-semibold text-forest underline underline-offset-4"
          >
            {t("routine.markDoneEarly", "Mark done early")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4 text-center">
      <p className="text-sm font-medium text-ink">
        {t("routine.setForToday", "You're set for today.")}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {t("routine.nothingElse", "Nothing else on the schedule.")}
      </p>
    </div>
  );
}
