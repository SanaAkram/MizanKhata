"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { deleteItem, upsertItem } from "@/lib/routine/db";
import { blankItem, defaultItems } from "@/lib/routine/defaults";
import { CATEGORY_LABEL, type RoutineCategory } from "@/lib/routine/types";
import {
  disablePush,
  enablePush,
  pushState,
  type PushState,
} from "@/lib/routine/push";
import {
  getSound,
  playReminderSound,
  setSound,
  SOUND_OPTIONS,
  type SoundName,
} from "@/lib/routine/sound";
import type { Database } from "@/lib/database.types";

type Row = Database["public"]["Tables"]["shop_routine_items"]["Insert"] & {
  window_min: number;
  days: number[];
};

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const CATS: RoutineCategory[] = ["prayer", "work", "health", "other"];

function toRow(
  i: Database["public"]["Tables"]["shop_routine_items"]["Row"],
): Row {
  return {
    id: i.id,
    label: i.label,
    category: i.category,
    at_time: i.at_time.slice(0, 5),
    window_min: i.window_min,
    days: i.days ?? [0, 1, 2, 3, 4, 5, 6],
    sort: i.sort,
    enabled: i.enabled,
  };
}

export default function RoutineSettingsClient({
  initialItems,
}: {
  initialItems: Database["public"]["Tables"]["shop_routine_items"]["Row"][];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => initialItems.map(toRow));
  const [removed, setRemoved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function patch(idx: number, next: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...next } : row)));
  }

  function addRow() {
    setRows((r) => [...r, blankItem((r.length + 1) * 10) as Row]);
  }

  function removeRow(idx: number) {
    setRows((r) => {
      const row = r[idx];
      if (row.id) setRemoved((x) => [...x, row.id!]);
      return r.filter((_, i) => i !== idx);
    });
  }

  function toggleDay(idx: number, day: number) {
    setRows((r) =>
      r.map((row, i) => {
        if (i !== idx) return row;
        const has = row.days.includes(day);
        return {
          ...row,
          days: has
            ? row.days.filter((d) => d !== day)
            : [...row.days, day].sort((a, b) => a - b),
        };
      }),
    );
  }

  function loadStarter() {
    setRows(defaultItems().map((d) => d as Row));
  }

  async function save() {
    setSaving(true);
    try {
      for (const id of removed) await deleteItem(supabase, id);
      let order = 0;
      for (const row of rows) {
        order += 10;
        await upsertItem(supabase, {
          id: row.id!,
          label: row.label.trim() || "Untitled",
          category: row.category,
          at_time: row.at_time,
          window_min: Math.max(5, Number(row.window_min) || 60),
          days: row.days.length ? row.days : [0, 1, 2, 3, 4, 5, 6],
          sort: order,
          enabled: row.enabled ?? true,
        });
      }
      router.push("/routine");
      router.refresh();
    } catch {
      alert("Could not save. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/routine" className="text-sm text-muted">
        ‹ Back to routine
      </Link>

      <ReminderSettings supabase={supabase} />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-5 text-center">
          <p className="text-sm text-muted">No routine items.</p>
          <button
            onClick={loadStarter}
            className="mt-3 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-paper"
          >
            Load starter set
          </button>
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {rows.map((row, idx) => (
          <li
            key={row.id ?? idx}
            className="rounded-2xl border border-line bg-card p-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={row.label}
                onChange={(e) => patch(idx, { label: e.target.value })}
                placeholder="Name"
                className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
              />
              <button
                onClick={() => removeRow(idx)}
                aria-label="Remove"
                className="shrink-0 rounded-lg px-2 py-2 text-danger active:bg-line"
              >
                ✕
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={row.at_time}
                onChange={(e) => patch(idx, { at_time: e.target.value })}
                className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-forest"
              />
              <label className="flex items-center gap-1 text-xs text-muted">
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={row.window_min}
                  onChange={(e) =>
                    patch(idx, { window_min: Number(e.target.value) })
                  }
                  className="w-16 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-forest"
                />
                min window
              </label>
              <select
                value={row.category}
                onChange={(e) =>
                  patch(idx, { category: e.target.value })
                }
                className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-forest"
              >
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
              <label className="ml-auto flex items-center gap-1 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={row.enabled ?? true}
                  onChange={(e) => patch(idx, { enabled: e.target.checked })}
                />
                on
              </label>
            </div>

            <div className="mt-2 flex gap-1">
              {DOW.map((d, di) => {
                const on = row.days.includes(di);
                return (
                  <button
                    key={di}
                    onClick={() => toggleDay(idx, di)}
                    className={`h-7 w-7 rounded-full text-xs font-semibold ${
                      on
                        ? "bg-forest text-paper"
                        : "border border-line text-muted"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={addRow}
        className="rounded-xl border border-dashed border-line px-4 py-3 text-sm font-semibold text-muted"
      >
        + Add item
      </button>

      <button
        onClick={save}
        disabled={saving}
        className="sticky bottom-24 rounded-xl bg-forest px-4 py-3.5 text-sm font-semibold text-paper shadow-lg active:scale-[0.99] disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save routine"}
      </button>
    </div>
  );
}

function ReminderSettings({
  supabase,
}: {
  supabase: ReturnType<typeof createClient>;
}) {
  const [push, setPush] = useState<PushState>("off");
  const [sound, setSoundState] = useState<SoundName>("chime");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void pushState().then(setPush);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoundState(getSound());
  }, []);

  async function toggle() {
    setBusy(true);
    setMsg("");
    if (push === "on") {
      await disablePush(supabase);
      setPush("off");
    } else {
      const r = await enablePush(supabase);
      if (r === "on") setPush("on");
      else if (r === "denied") setMsg("Notifications are blocked in the browser.");
      else if (r === "unsupported")
        setMsg("This browser can't do background reminders.");
      else if (r === "no-key") setMsg("Push key not configured yet.");
      else setMsg("Couldn't turn it on — try again.");
    }
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Reminders
      </h2>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Background reminders</p>
          <p className="text-xs text-muted">
            Get nudged even when the app is closed. On iPhone, add Roznamcha to
            your Home Screen first.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={busy || push === "unsupported" || push === "no-key"}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
            push === "on"
              ? "bg-forest text-paper"
              : "border border-line text-muted"
          } disabled:opacity-50`}
        >
          {busy ? "…" : push === "on" ? "On" : "Turn on"}
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs text-danger">{msg}</p> : null}

      <div className="mt-4">
        <p className="text-sm font-semibold text-ink">In-app sound</p>
        <p className="text-xs text-muted">
          Plays when a reminder fires while the app is open.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <select
            value={sound}
            onChange={(e) => {
              const v = e.target.value as SoundName;
              setSoundState(v);
              setSound(v);
              playReminderSound(v);
            }}
            className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
          >
            {SOUND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => playReminderSound(sound)}
            className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted"
          >
            Test
          </button>
        </div>
      </div>
    </section>
  );
}
