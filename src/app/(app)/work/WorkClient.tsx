"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteSession,
  insertSession,
  sumDuration,
  updateSessionNote,
  type WorkSession,
} from "@/lib/work/db";
import { newId } from "@/lib/ids";
import { fmtClock, fmtDuration, fmtTimeOfDay } from "@/lib/format";
import { dateKey } from "@/lib/date";
import { PlayIcon, StopIcon } from "@/components/icons";

const RUNNING_KEY = "roznamcha:running";

type Props = {
  initialSessions: WorkSession[];
  todayKey: string;
};

export default function WorkClient({ initialSessions, todayKey }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [sessions, setSessions] = useState<WorkSession[]>(initialSessions);
  const [running, setRunning] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [expanded, setExpanded] = useState<string | null>(null);

  // Restore a running timer from a previous visit (post-mount, so no SSR
  // hydration mismatch on the persisted value).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RUNNING_KEY);
      if (raw) {
        const v = JSON.parse(raw) as { start?: number };
        if (typeof v.start === "number" && v.start > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRunning(v.start);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Tick while running.
  useEffect(() => {
    if (running == null) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  function start() {
    const s = Date.now();
    setRunning(s);
    setNowMs(s);
    try {
      localStorage.setItem(RUNNING_KEY, JSON.stringify({ start: s }));
    } catch {
      /* ignore */
    }
  }

  async function stop() {
    if (running == null) return;
    const startMs = running;
    const end = Date.now();
    const durationMs = end - startMs;
    setRunning(null);
    try {
      localStorage.removeItem(RUNNING_KEY);
    } catch {
      /* ignore */
    }
    if (durationMs < 1000) return; // accidental tap

    const id = newId("ws_");
    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(end).toISOString();
    const optimistic: WorkSession = {
      id,
      owner_id: "",
      start_time: startIso,
      end_time: endIso,
      duration_ms: durationMs,
      note: null,
      created_at: endIso,
    };
    setSessions((prev) => [optimistic, ...prev]);
    try {
      await insertSession(supabase, {
        id,
        start: startIso,
        end: endIso,
        durationMs,
      });
    } catch {
      setSessions((prev) => prev.filter((x) => x.id !== id));
      alert("Could not save that session. Check your connection and try again.");
    }
  }

  async function saveNote(id: string, note: string) {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, note: note.trim() || null } : s)),
    );
    try {
      await updateSessionNote(supabase, id, note);
    } catch {
      /* keep optimistic value; next load will reconcile */
    }
  }

  async function removeSession(id: string) {
    const prev = sessions;
    setSessions((s) => s.filter((x) => x.id !== id));
    setExpanded(null);
    try {
      await deleteSession(supabase, id);
    } catch {
      setSessions(prev);
      alert("Could not delete that session.");
    }
  }

  const runningMs = running != null ? Math.max(0, nowMs - running) : 0;

  const todaySessions = sessions.filter(
    (s) => dateKey(new Date(s.start_time)) === todayKey,
  );
  const todayMs = sumDuration(todaySessions);
  const weekMs = sumDuration(sessions);

  const earlierByDay = groupEarlier(sessions, todayKey);

  return (
    <div className="flex flex-col gap-5">
      {/* Timer */}
      <section className="rounded-2xl border border-line bg-card p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {running != null ? "Working" : "Timer"}
        </p>
        <p
          className={`numeric mt-2 text-5xl font-semibold tabular-nums ${
            running != null ? "text-forest" : "text-muted/60"
          }`}
        >
          {fmtClock(runningMs)}
        </p>
        {running != null ? (
          <p className="mt-1 text-xs text-muted">
            since {fmtTimeOfDay(new Date(running))}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">Tap start when you begin.</p>
        )}

        <button
          onClick={running != null ? stop : start}
          className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-base font-semibold text-paper transition active:scale-[0.99] ${
            running != null ? "bg-danger" : "bg-forest"
          }`}
        >
          {running != null ? (
            <>
              <StopIcon className="h-5 w-5" /> Stop
            </>
          ) : (
            <>
              <PlayIcon className="h-5 w-5" /> Start
            </>
          )}
        </button>
      </section>

      {/* Totals */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Today
          </p>
          <p className="numeric mt-1 text-2xl font-semibold text-ink">
            {fmtDuration(todayMs)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {todaySessions.length}{" "}
            {todaySessions.length === 1 ? "session" : "sessions"}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            This week
          </p>
          <p className="numeric mt-1 text-2xl font-semibold text-ink">
            {fmtDuration(weekMs)}
          </p>
          <p className="mt-0.5 text-xs text-muted">Mon–Sun</p>
        </div>
      </section>

      {/* Today's sessions */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Today&apos;s sessions
        </h2>
        {todaySessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            No sessions logged today yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todaySessions.map((s) => {
              const open = expanded === s.id;
              return (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-xl border border-line bg-card"
                >
                  <button
                    onClick={() => setExpanded(open ? null : s.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm text-ink">
                      {fmtTimeOfDay(new Date(s.start_time))}
                      {" – "}
                      {s.end_time
                        ? fmtTimeOfDay(new Date(s.end_time))
                        : "…"}
                      {s.note ? (
                        <span className="block text-xs text-muted">
                          {s.note}
                        </span>
                      ) : null}
                    </span>
                    <span className="numeric text-sm font-semibold text-forest">
                      {fmtDuration(Number(s.duration_ms) || 0)}
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-line px-4 py-3">
                      <textarea
                        defaultValue={s.note ?? ""}
                        placeholder="Note (what did you work on?)"
                        rows={2}
                        onBlur={(e) => saveNote(s.id, e.target.value)}
                        className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
                      />
                      <button
                        onClick={() => removeSession(s.id)}
                        className="mt-2 text-xs font-semibold text-danger"
                      >
                        Delete session
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Earlier this week */}
      {earlierByDay.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Earlier this week
          </h2>
          <ul className="flex flex-col gap-1.5">
            {earlierByDay.map((d) => (
              <li
                key={d.key}
                className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-2.5"
              >
                <span className="text-sm text-ink">{d.label}</span>
                <span className="numeric text-sm font-semibold text-forest">
                  {fmtDuration(d.ms)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function groupEarlier(sessions: WorkSession[], todayKey: string) {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = dateKey(new Date(s.start_time));
    if (k === todayKey) continue;
    map.set(k, (map.get(k) ?? 0) + (Number(s.duration_ms) || 0));
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, ms]) => {
      const d = new Date(key + "T12:00:00");
      return {
        key,
        ms,
        label: d.toLocaleDateString([], {
          weekday: "long",
          day: "numeric",
          month: "short",
        }),
      };
    });
}
