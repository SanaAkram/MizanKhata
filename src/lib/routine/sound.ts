"use client";

const KEY = "mizankhata:sound";
const AZAN_KEY = "mizankhata:azan"; // "on" | "off" — azan for prayer reminders
const NUDGE_KEY = "mizankhata:nudge-min"; // 5 | 10 | 15

export type SoundName = "chime" | "bell" | "soft" | "off";
export const SOUND_OPTIONS: { value: SoundName; label: string }[] = [
  { value: "chime", label: "Chime" },
  { value: "bell", label: "Bell" },
  { value: "soft", label: "Soft" },
  { value: "off", label: "Silent" },
];

export const NUDGE_OPTIONS = [5, 10, 15] as const;

export function getSound(): SoundName {
  try {
    const v = localStorage.getItem(KEY) as SoundName | null;
    return v ?? "chime";
  } catch {
    return "chime";
  }
}

export function setSound(s: SoundName): void {
  try {
    localStorage.setItem(KEY, s);
  } catch {
    /* ignore */
  }
}

/** Play the azan clip for prayer reminders (only while the app is open). */
export function getAzanEnabled(): boolean {
  try {
    return localStorage.getItem(AZAN_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setAzanEnabled(on: boolean): void {
  try {
    localStorage.setItem(AZAN_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

/** How often an unanswered reminder re-nags, in minutes. */
export function getNudgeMin(): number {
  try {
    const n = Number(localStorage.getItem(NUDGE_KEY));
    return NUDGE_OPTIONS.includes(n as (typeof NUDGE_OPTIONS)[number]) ? n : 10;
  } catch {
    return 10;
  }
}

export function setNudgeMin(n: number): void {
  try {
    localStorage.setItem(NUDGE_KEY, String(n));
  } catch {
    /* ignore */
  }
}

let azanEl: HTMLAudioElement | null = null;

/** Play a real azan recording from /azan.mp3. Resolves false if it can't. */
export function playAzan(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  try {
    if (!azanEl) {
      azanEl = new Audio("/azan.mp3");
      azanEl.preload = "auto";
    }
    azanEl.currentTime = 0;
    const p = azanEl.play();
    if (p && typeof p.then === "function") {
      return p.then(() => true).catch(() => false);
    }
    return Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

/** Stop the azan if it's playing (e.g. user marked the prayer done). */
export function stopAzan(): void {
  try {
    if (azanEl) {
      azanEl.pause();
      azanEl.currentTime = 0;
    }
  } catch {
    /* ignore */
  }
}

/**
 * Play the chosen in-app reminder tone. Synthesised with Web Audio so no audio
 * files are needed. Only used while a tab is open — background OS notifications
 * play the phone's own notification sound.
 *
 * For a prayer reminder (`opts.prayer`) it plays the azan clip instead, when
 * that's enabled and /azan.mp3 is present; otherwise it falls back to the tone.
 */
export function playReminderSound(
  arg?: SoundName | { name?: SoundName; prayer?: boolean },
): void {
  const opts =
    typeof arg === "string" || arg == null ? { name: arg ?? undefined } : arg;
  const s = opts.name ?? getSound();

  if (opts.prayer && getAzanEnabled()) {
    void playAzan().then((ok) => {
      if (!ok) playTone(s);
    });
    return;
  }
  playTone(s);
}

function playTone(s: SoundName): void {
  if (s === "off" || typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes =
      s === "bell"
        ? [880, 1318.5]
        : s === "soft"
          ? [523.25, 659.25]
          : [659.25, 987.77];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = s === "soft" ? "sine" : "triangle";
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = now + i * 0.16;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.start(t);
      o.stop(t + 0.55);
    });
    window.setTimeout(() => void ctx.close(), 1300);
  } catch {
    /* ignore */
  }
}
