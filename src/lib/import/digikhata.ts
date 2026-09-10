/**
 * Parse the text of a Digikhata statement PDF.
 * Pure — no pdf.js, no React. Feed it the output of extractPdfText().
 */

export type ImportEntry = {
  row: number; // stable index within the file, for dedup
  date: string; // ISO
  note: string;
  amount: number; // always positive
  type: "credit" | "payment";
};

export type PartyImport = {
  kind: "party";
  partyKind: "customer" | "supplier";
  name: string;
  phone: string | null;
  openingBalance: number;
  statedNet: number; // "Net Balance" from the header
  entries: ImportEntry[];
  /** closing balance we derive from the entries — should equal statedNet */
  derivedNet: number;
  ok: boolean;
};

export type CashImport = {
  kind: "cash";
  openingCash: number;
  days: { date: string; in: number; out: number }[];
  statedNet: number;
};

export type ParseResult =
  | ({ format: "party" } & PartyImport)
  | ({ format: "cash" } & CashImport)
  | { format: "unknown"; hint: string };

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function num(s: string): number {
  return Number(String(s).replace(/[^\d.-]/g, "")) || 0;
}

/** "15 Nov 25" / "1 Sep 26" → ISO at local noon (avoids TZ date slips). */
function parseDate(s: string): string | null {
  const m = s
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mon = MONTHS[m[2].toLowerCase()];
  if (mon == null) return null;
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  return new Date(y, mon, d, 12, 0, 0).toISOString();
}

function normPhone(raw: string): string | null {
  const d = raw.replace(/[^\d]/g, "");
  const m =
    d.match(/^92(3\d{9})$/) ||
    d.match(/^0(3\d{9})$/) ||
    d.match(/^(3\d{9})$/) ||
    d.match(/^0092(3\d{9})$/);
  return m ? `+92${m[1]}` : null;
}

export function parseDigikhata(text: string): ParseResult {
  if (/Cashbook Statement/i.test(text)) return parseCashbook(text);
  if (/\bStatement\b/i.test(text) && /No\.?\s*of\s*Entries/i.test(text))
    return parseParty(text);
  return {
    format: "unknown",
    hint: "This doesn't look like a Digikhata party statement or cash book PDF.",
  };
}

function parseParty(text: string): ParseResult {
  const lines = text.split("\n");

  const nameLine = lines.find((l) => /\bStatement\s*$/i.test(l.trim()));
  const name = nameLine
    ? nameLine.replace(/\s*Statement\s*$/i, "").trim()
    : "Unknown";

  const phoneM = text.match(/Phone\s*Number:\s*([+\d][\d\s+()-]+)/i);
  const phone = phoneM ? normPhone(phoneM[1]) : null;

  // (will give) = we owe them = supplier ; (will get) = they owe us = customer
  const partyKind: "customer" | "supplier" = /\(will give\)/i.test(text)
    ? "supplier"
    : "customer";

  const openM = text.match(/Opening Balance\s*Rs\s*([\d,]+)/i);
  const settled = /Opening Balance[\s\S]{0,40}\(settled\)/i.test(text);
  const openingBalance = settled ? 0 : openM ? num(openM[1]) : 0;

  const netM = text.match(/Net Balance\s*Rs\s*([\d,]+)/i);
  const statedNet = netM ? num(netM[1]) : 0;

  // rows:  "<#> <D Mon YY> <details...> [Rs x] [Rs y] Rs <balance>"
  const rowRe =
    /^(\d+)\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\s+(.+?)\s+((?:Rs\s*[\d,]+\s*){1,3})$/;

  const entries: ImportEntry[] = [];
  let prev = openingBalance;
  let idx = 0;

  for (const raw of lines) {
    const l = raw.trim();
    if (/^Grand Total/i.test(l) || /^Report Generated/i.test(l)) continue;
    const m = l.match(rowRe);
    if (!m) continue;
    const date = parseDate(m[2]);
    if (!date) continue;
    const amounts = (m[4].match(/[\d,]+/g) ?? []).map(num);
    if (amounts.length === 0) continue;
    const balance = amounts[amounts.length - 1];
    const delta = Math.round((balance - prev) * 100) / 100;
    prev = balance;
    if (delta === 0) continue;
    idx += 1;
    entries.push({
      row: idx,
      date,
      note: m[3].replace(/\s+/g, " ").trim() || "Entry",
      amount: Math.abs(delta),
      // balance went UP => they owe us / we owe them MORE => "credit"
      type: delta > 0 ? "credit" : "payment",
    });
  }

  const derivedNet = Math.round(prev * 100) / 100;

  return {
    format: "party",
    kind: "party",
    partyKind,
    name,
    phone,
    openingBalance,
    statedNet,
    entries,
    derivedNet,
    ok: Math.abs(derivedNet - statedNet) < 1,
  };
}

function parseCashbook(text: string): ParseResult {
  const lines = text.split("\n");
  const netM = text.match(/Net Balance\s*Rs?\s*([\d,]+)/i);
  const statedNet = netM ? num(netM[1]) : 0;

  // "<#> <D Mon YY> Entries <n> <in> <out> <dailyBal> Rs <cashInHand>"
  const rowRe =
    /^(\d+)\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\s+Entries\s+\d+\s+([\d,]+)\s+([\d,]+)\s+[\d,]+\s+Rs\s*([\d,]+)/i;

  const days: { date: string; in: number; out: number }[] = [];
  let openingCash = 0;
  let first = true;

  for (const raw of lines) {
    const m = raw.trim().match(rowRe);
    if (!m) continue;
    const date = parseDate(m[2]);
    if (!date) continue;
    const dIn = num(m[3]);
    const dOut = num(m[4]);
    const cih = num(m[5]);
    if (first) {
      openingCash = Math.round((cih - dIn + dOut) * 100) / 100;
      first = false;
    }
    if (dIn > 0 || dOut > 0) days.push({ date, in: dIn, out: dOut });
  }

  return {
    format: "cash",
    kind: "cash",
    openingCash,
    days,
    statedNet,
  };
}
