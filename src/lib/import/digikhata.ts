/**
 * Parse the text of a Digikhata statement PDF.
 * Pure — no pdf.js, no React. Feed it the output of extractPdfText().
 *
 * extractPdfText() emits one *token* per line, in the PDF's original
 * content-stream order (see its own doc comment for why) — not one merged
 * line per visual row, and not grouped by on-page position. Every parser
 * below is a small scanner over that token stream, not a single "match the
 * whole row" regex, because a row's Details/note cell can wrap across many
 * tokens (and even a page break) before the row's own amount and balance
 * show up.
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

// ---- shared token-stream helpers -------------------------------------

const INT_RE = /^\d+$/;
/** A single token holding a whole "D Mon YY" date — how Digikhata emits a
 *  row's own date. (The one-off "(Opening Balance: …)" marker before row 1
 *  instead spreads its date over 3 separate day/month/year tokens, which is
 *  exactly what lets us tell it apart from a real row without special-casing
 *  it: it never matches this.) */
const DATE_TOKEN_RE = /^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}$/;
/** "Rs 1,234.56", optionally with an embedded "cr"/"dr" (Digikhata sometimes
 *  emits the balance's cr/dr as its own following token instead — see the
 *  bare-suffix check at the row scanners below). */
const AMOUNT_RE = /^Rs\.?\s*([\d,]+(?:\.\d+)?)\s*(cr|dr)?\)?$/i;

function tokenize(text: string): string[] {
  return text
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
}

function isRowStart(tokens: string[], i: number): boolean {
  return (
    i + 1 < tokens.length &&
    INT_RE.test(tokens[i]) &&
    DATE_TOKEN_RE.test(tokens[i + 1])
  );
}

// ---- party (customer / supplier) ledger statement ----------------------

function parseParty(text: string): ParseResult {
  const tokens = tokenize(text);
  // Header fields (name, phone, balances) are one-off, so it's simplest to
  // read them off a single space-joined string — \s+ below absorbs both a
  // literal space and a token-boundary newline the same way, which matters
  // because a couple of these labels ("Opening" / "Balance", "Net Balance")
  // sometimes wrap across two tokens when the party's name is long.
  const flat = tokens.join(" ").replace(/\s+/g, " ");

  const nameTok = tokens.find((t) => /\bStatement\s*$/i.test(t));
  const name = nameTok
    ? nameTok.replace(/\s*Statement\s*$/i, "").trim()
    : "Unknown";

  const phoneM = flat.match(/Phone\s*Number:\s*([+\d][\d\s+()-]+?)(?=\s|$)/i);
  const phone = phoneM ? normPhone(phoneM[1]) : null;

  // "(<party> will get)" — they'll get paid, i.e. we owe them = supplier.
  // "(<party> will give)" — they'll give/pay us, i.e. they owe us = customer
  // (the default, since a mis-worded or unseen phrasing is far more likely
  // to be an ordinary customer than a supplier).
  const partyKind: "customer" | "supplier" = /will\s+get\)/i.test(flat)
    ? "supplier"
    : "customer";

  // Prefer the "Opening Balance" summary card; fall back to the inline
  // "(Opening Balance: Rs …)" marker that sits just before row 1 in the
  // table, in case a future export lays the header out differently.
  const openHeaderM = flat.match(
    /Opening\s+Balance\s+Rs\.?\s*([\d,]+(?:\.\d+)?)/i,
  );
  const openMarkerM = flat.match(
    /\(Opening Balance:\s*Rs\.?\s*([\d,]+(?:\.\d+)?)\s*(?:cr|dr)?\)/i,
  );
  const openingBalance = num(openHeaderM?.[1] ?? openMarkerM?.[1] ?? "0");

  const netM = flat.match(/Net\s+Balance\s+Rs\.?\s*([\d,]+(?:\.\d+)?)/i);
  const statedNet = netM ? num(netM[1]) : 0;

  // Row grammar, as tokens (one row = one purchase/sale/payment entry):
  //   INTEGER  DATE  NOTE*  AMOUNT{1,2}  SUFFIX?
  // NOTE* is zero or more free-text fragments (a wrapped Details cell —
  // can run to several tokens, occasionally spanning a page break).
  // AMOUNT is "Rs …", 1 or 2 of them (a purchase/payment-only row has 1: its
  // balance; a normal row has 2: the directional amount, then the balance —
  // we don't need to tell those apart, since the entry's amount and
  // direction both come from how much the *balance* moved from the row
  // before). SUFFIX is a bare "cr"/"dr" when the balance didn't embed it.
  const entries: ImportEntry[] = [];
  let prev = openingBalance;
  let idx = 0;
  let i = 0;

  while (i < tokens.length) {
    if (/^Grand Total/i.test(tokens[i])) break;
    if (!isRowStart(tokens, i)) {
      i += 1;
      continue;
    }

    const date = parseDate(tokens[i + 1]);
    i += 2;
    const noteParts: string[] = [];
    const amounts: number[] = [];

    while (i < tokens.length) {
      const tok = tokens[i];
      if (/^Grand Total/i.test(tok) || /^Report Generated/i.test(tok)) break;
      // A new row starting mid-scan ends this one (only once we've actually
      // captured this row's balance — otherwise a stray bare number deep in
      // a note could look like one, though that's never happened in the
      // statements this was built against).
      if (amounts.length > 0 && isRowStart(tokens, i)) break;

      const amtM = tok.match(AMOUNT_RE);
      if (amtM) {
        amounts.push(num(amtM[1]));
        i += 1;
        continue;
      }
      if (/^(cr|dr)\)?$/i.test(tok)) {
        i += 1; // bare balance suffix — direction comes from the delta below
        continue;
      }
      noteParts.push(tok);
      i += 1;
    }

    if (!date || amounts.length === 0) continue; // malformed row — skip it
    const balance = amounts[amounts.length - 1];
    const delta = Math.round((balance - prev) * 100) / 100;
    prev = balance;
    if (delta === 0) continue;
    idx += 1;
    const type: "credit" | "payment" = delta > 0 ? "credit" : "payment";
    const note = noteParts.join(" ").replace(/\s+/g, " ").trim();
    const fallbackNote =
      type === "payment"
        ? partyKind === "supplier"
          ? "Payment made"
          : "Payment received"
        : partyKind === "supplier"
          ? "Purchase"
          : "Credit sale";
    entries.push({
      row: idx,
      date,
      note: note || fallbackNote,
      amount: Math.abs(delta),
      type,
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

// ---- cash book statement ------------------------------------------------

/**
 * Re-joins a cash-book row's tokens (row# + date, up to the next row start
 * or the closing "Grand Total"/"Report Generated" lines) into one
 * space-joined line. Unlike the party table, cash-book rows are fixed
 * numeric columns with no wrapping "Details" cell, so reassembling one row
 * per line this way is safe — it just undoes the one-token-per-column split
 * `extractPdfText()` produces, without needing a bespoke per-column scanner.
 */
function regroupRows(tokens: string[]): string[] {
  const rows: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (/^Grand Total/i.test(tokens[i]) || /^Report Generated/i.test(tokens[i])) {
      i += 1;
      continue;
    }
    if (!isRowStart(tokens, i)) {
      i += 1;
      continue;
    }
    const start = i;
    i += 1;
    while (
      i < tokens.length &&
      !isRowStart(tokens, i) &&
      !/^Grand Total/i.test(tokens[i]) &&
      !/^Report Generated/i.test(tokens[i])
    ) {
      i += 1;
    }
    rows.push(tokens.slice(start, i).join(" "));
  }
  return rows;
}

function parseCashbook(text: string): ParseResult {
  const tokens = tokenize(text);
  const flat = tokens.join(" ").replace(/\s+/g, " ");
  const netM = flat.match(/Net\s+Balance\s+Rs\.?\s*([\d,]+(?:\.\d+)?)/i);
  const statedNet = netM ? num(netM[1]) : 0;

  // "<#> <D Mon YY> Entries <n> <in> <out> <dailyBal> Rs <cashInHand>"
  const rowRe =
    /^(\d+)\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\s+Entries\s+\d+\s+([\d,]+)\s+([\d,]+)\s+[\d,]+\s+Rs\.?\s*([\d,]+)/i;

  const days: { date: string; in: number; out: number }[] = [];
  let openingCash = 0;
  let first = true;

  for (const line of regroupRows(tokens)) {
    const m = line.match(rowRe);
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
