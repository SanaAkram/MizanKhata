"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addDays, dateKey, parseDateKey, startOfWeek } from "@/lib/date";
import { fmt12h, fmtTimeOfDay } from "@/lib/format";
import { defaultItems } from "@/lib/routine/defaults";
import {
  clearLog,
  fetchLogsBetween,
  insertItems,
  logId,
  upsertLog,
} from "@/lib/routine/db";
import {
  activeOccurrence,
  adherence,
  buildOccurrences,
  catchUpQueue,
  nextUpcoming,
  timelineBounds,
  type Occurrence,
} from "@/lib/routine/schedule";
import { useRoutineTicker } from "@/lib/routine/useRoutineTicker";
import { notifPermission, requestNotif } from "@/lib/routine/notify";
import type {
  RoutineItem,
  RoutineLog,
  RoutineStatus,
} from "@/lib/routine/types";
import Sheet from "@/components/Sheet";
import WeekStrip from "./WeekStrip";
import DayTimeline from "./DayTimeline";
import DueNowCard from "./DueNowCard";

type Props = {
  initialItems: RoutineItem[];
  initialLogs: RoutineLog[];
  todayKey: string;
};

export default function RoutineClient({
  initialItems,
  initialLogs,
  todayKey,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const items = initialItems;

  const [logs, setLogs] = useState<RoutineLog[]>(initialLogs);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(parseDateKey(todayKey)),
  );
  const [loadedWeeks, setLoadedWeeks] = useState<Set<string>>(
    () => new Set([dateKey(startOfWeek(parseDateKey(todayKey)))]),
  );
  const [seeding, setSeeding] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [pick, setPick] = useState<Occurrence | null>(null);

  useEffect(() => {
    // Read the live Notification permission after mount (SSR can't know it).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPerm(notifPermission());
  }, []);

  const logsByDate = useMemo(() => {
    const m = new Map<string, RoutineLog[]>();
    for (const l of logs) {
      const arr = m.get(l.date);
      if (arr) arr.push(l);
      else m.set(l.date, [l]);
    }
    return m;
  }, [logs]);

  const todayLogs = useMemo(
    () => logsByDate.get(todayKey) ?? [],
    [logsByDate, todayKey],
  );
  const loggedTodayIds = useMemo(
    () => new Set(todayLogs.map((l) => l.item_id)),
    [todayLogs],
  );

  const now = useRoutineTicker(items, loggedTodayIds);

  const ensureWeek = useCallback(
    async (ws: Date) => {
      const key = dateKey(ws);
      if (loadedWeeks.has(key)) return;
      setLoadedWeeks((prev) => new Set(prev).add(key));
      try {
        const rows = await fetchLogsBetween(
          supabase,
          dateKey(ws),
          dateKey(addDays(ws, 6)),
        );
        setLogs((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
      } catch {
        /* ignore */
      }
    },
    [supabase, loadedWeeks],
  );

  function shiftWeek(delta: number) {
    const ws = addDays(weekStart, delta * 7);
    setWeekStart(ws);
    void ensureWeek(ws);
    const dow = (parseDateKey(selectedKey).getDay() + 6) % 7;
    setSelectedKey(dateKey(addDays(ws, dow)));
  }

  async function mark(dk: string, itemId: string, status: RoutineStatus) {
    const id = logId(dk, itemId);
    const nowIso = new Date().toISOString();
    setLogs((prev) => [
      ...prev.filter((l) => l.id !== id),
      {
        id,
        owner_id: "",
        date: dk,
        item_id: itemId,
        status,
        responded_at: nowIso,
        note: null,
        created_at: nowIso,
      },
    ]);
    setPick(null);
    try {
      await upsertLog(supabase, dk, itemId, status);
    } catch {
      /* reconciled on next load */
    }
  }

  async function undo(dk: string, itemId: string) {
    const id = logId(dk, itemId);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setPick(null);
    try {
      await clearLog(supabase, dk, itemId);
    } catch {
      /* ignore */
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      await insertItems(supabase, defaultItems());
      router.refresh();
    } catch {
      alert("Could not create the starter routine. Try again.");
      setSeeding(false);
    }
  }

  const selectedLogs = useMemo(
    () => logsByDate.get(selectedKey) ?? [],
    [logsByDate, selectedKey],
  );
  const occs = useMemo(
    () => buildOccurrences(items, selectedLogs, selectedKey, now),
    [items, selectedLogs, selectedKey, now],
  );
  const bounds = useMemo(() => timelineBounds(items), [items]);

  const isToday = selectedKey === todayKey;
  const todayOccs = useMemo(
    () => buildOccurrences(items, todayLogs, todayKey, now),
    [items, todayLogs, todayKey, now],
  );

  const weekAdh = useMemo(() => {
    const m = new Map<string, { done: number; total: number }>();
    for (let i = 0; i < 7; i++) {
      const dk = dateKey(addDays(weekStart, i));
      const a = adherence(
        buildOccurrences(items, logsByDate.get(dk) ?? [], dk, now),
      );
      m.set(dk, { done: a.done, total: a.total });
    }
    return m;
  }, [items, logsByDate, weekStart, now]);

  if (items.length === 0) {
    return <FirstRun onSeed={seed} seeding={seeding} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {perm === "default" ? (
        <button
          onClick={() => void requestNotif().then(setPerm)}
          className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-left"
        >
          <span className="text-sm font-semibold text-ink">
            Turn on reminders
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            A nudge when each item is due, and a check-in once its time passes.
          </span>
        </button>
      ) : null}

      <WeekStrip
        weekStart={weekStart}
        selectedKey={selectedKey}
        todayKey={todayKey}
        adherence={weekAdh}
        onSelect={setSelectedKey}
        onShift={shiftWeek}
      />

      {isToday ? (
        <DueNowCard
          active={activeOccurrence(todayOccs)}
          next={nextUpcoming(todayOccs)}
          catchUp={catchUpQueue(todayOccs)}
          now={now}
          onMark={(id, s) => void mark(todayKey, id, s)}
        />
      ) : null}

      <DayTimeline
        occurrences={occs}
        bounds={bounds}
        isToday={isToday}
        now={now}
        onPick={setPick}
      />

      <Sheet
        open={!!pick}
        title={pick?.item.label}
        onClose={() => setPick(null)}
      >
        {pick ? (
          <PickActions
            occ={pick}
            onMark={(s) => void mark(selectedKey, pick.item.id, s)}
            onUndo={() => void undo(selectedKey, pick.item.id)}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function FirstRun({
  onSeed,
  seeding,
}: {
  onSeed: () => void;
  seeding: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-6 text-center">
      <h2 className="numeric text-xl font-semibold text-forest">
        Set up your routine
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
        Start with the five prayers plus open/close shop, a morning walk and
        sleep. You can change every time and add your own afterwards.
      </p>
      <button
        onClick={onSeed}
        disabled={seeding}
        className="mt-5 w-full rounded-xl bg-forest px-4 py-3.5 text-sm font-semibold text-paper active:scale-[0.99] disabled:opacity-60"
      >
        {seeding ? "Creating…" : "Add starter routine"}
      </button>
    </div>
  );
}

function PickActions({
  occ,
  onMark,
  onUndo,
}: {
  occ: Occurrence;
  onMark: (s: RoutineStatus) => void;
  onUndo: () => void;
}) {
  const statusLabel: Record<RoutineStatus, string> = {
    pending: "Not logged yet",
    done: "Marked done",
    missed: "Marked missed",
    skipped: "Skipped",
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        {fmt12h(occ.item.at_time)} · window until {fmtTimeOfDay(occ.end)}
        <span className="mx-1">·</span>
        {statusLabel[occ.status]}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onMark("done")}
          className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper"
        >
          Done
        </button>
        <button
          onClick={() => onMark("missed")}
          className="rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-danger"
        >
          Missed
        </button>
        <button
          onClick={() => onMark("skipped")}
          className="rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-muted"
        >
          Skip
        </button>
        <button
          onClick={onUndo}
          disabled={occ.status === "pending" && !occ.logged}
          className="rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-muted disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
