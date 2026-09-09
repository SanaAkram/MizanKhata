/** Unit choices for products, matching what a hardware shop actually uses. */
export const UNITS = [
  "pcs",
  "dozen",
  "kg",
  "gram",
  "meter",
  "feet",
  "inch",
  "box",
  "carton",
  "packet",
  "bag",
  "bundle",
  "roll",
  "set",
  "pair",
  "litre",
  "ton",
] as const;

export type Unit = (typeof UNITS)[number];

export function normalizeUnit(u: string | null | undefined): string {
  const v = (u ?? "").trim().toLowerCase();
  if (!v) return "pcs";
  if (v === "dzn" || v === "doz") return "dozen";
  if (v === "pc" || v === "piece" || v === "pieces") return "pcs";
  return (UNITS as readonly string[]).includes(v) ? v : v;
}
