/** Shared field validation for signup — used on both client and server. */

export type PwCheck = {
  ok: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  problems: string[];
};

/**
 * Password must be strong: ≥8 chars with a lowercase, an uppercase, a digit
 * and a symbol, and not an obvious pattern. "Unique / not leaked" is enforced
 * separately by Supabase (enable leaked-password protection in the dashboard).
 */
export function checkPassword(pw: string): PwCheck {
  const problems: string[] = [];
  if (pw.length < 8) problems.push("at least 8 characters");
  if (!/[a-z]/.test(pw)) problems.push("a small letter");
  if (!/[A-Z]/.test(pw)) problems.push("a capital letter");
  if (!/[0-9]/.test(pw)) problems.push("a number");
  if (!/[^A-Za-z0-9]/.test(pw)) problems.push("a symbol (e.g. ! @ # $)");

  const weak = [
    "password",
    "12345678",
    "qwerty",
    "11111111",
    "abcabcabc",
    "mizankhata",
  ];
  if (weak.some((w) => pw.toLowerCase().includes(w)))
    problems.push("something less common");

  // rough strength score for the meter
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const label = ["Very weak", "Weak", "Okay", "Good", "Strong"][s];

  return { ok: problems.length === 0, score: s, label, problems };
}

/**
 * Pakistani mobile number. Accepts `03XXXXXXXXX`, `3XXXXXXXXX`,
 * `+923XXXXXXXXX`, `00923XXXXXXXXX`, with spaces/dashes.
 * Returns the normalized `+923XXXXXXXXX` form, or null if invalid.
 */
export function normalizePhonePk(raw: string): string | null {
  const d = raw.replace(/[\s\-()]/g, "");
  let m: RegExpMatchArray | null;
  if ((m = d.match(/^\+92(3\d{9})$/))) return `+92${m[1]}`;
  if ((m = d.match(/^0092(3\d{9})$/))) return `+92${m[1]}`;
  if ((m = d.match(/^92(3\d{9})$/))) return `+92${m[1]}`;
  if ((m = d.match(/^0(3\d{9})$/))) return `+92${m[1]}`;
  if ((m = d.match(/^(3\d{9})$/))) return `+92${m[1]}`;
  return null;
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
