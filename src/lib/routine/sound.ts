"use client";

const KEY = "roznamcha:sound";

export type SoundName = "chime" | "bell" | "soft" | "off";
export const SOUND_OPTIONS: { value: SoundName; label: string }[] = [
  { value: "chime", label: "Chime" },
  { value: "bell", label: "Bell" },
  { value: "soft", label: "Soft" },
  { value: "off", label: "Silent" },
];

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

/**
 * Play the chosen in-app reminder tone. Synthesised with Web Audio so no audio
 * files are needed. Only used while a tab is open — background OS notifications
 * play the phone's own notification sound.
 */
export function playReminderSound(name?: SoundName): void {
  const s = name ?? getSound();
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
