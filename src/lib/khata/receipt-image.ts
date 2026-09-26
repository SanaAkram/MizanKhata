"use client";

import { APP_NAME, APP_URL } from "@/lib/brand";

export type ReceiptRow = { left: string; right?: string };

/** One line of an itemised ITEM / QTY / RATE / AMOUNT table. Numbers come
 *  in pre-formatted (the caller decides rounding/decimals/commas) — same
 *  convention as ReceiptRow.right and totals[].value below. */
export type ReceiptItemRow = {
  name: string;
  qty: string;
  rate: string;
  amount: string;
};

export type ReceiptSpec = {
  shopName: string;
  shopSub?: string; // phone / address line
  heading: string; // "ORDER" or "BILL #12"
  party?: string; // customer / supplier name (omit for supplier-facing order slips)
  dateText?: string;
  rows: ReceiptRow[]; // plain item lines (no rate/amount columns — e.g. order slips)
  items?: ReceiptItemRow[]; // itemised table with a header row; takes over from `rows` when set
  qtyItems?: { name: string; qty: string }[]; // ITEM/QTY table, no price — a no-price order slip; takes over from `rows` when set (and `items` isn't)
  totals?: { label: string; value: string; bold?: boolean }[];
  note?: string | null;
  brand?: string; // hex accent
  logoUrl?: string | null; // Premium shop logo — falls back to the app icon
};

const W = 480;
const PAD = 28;
const BODY = W - PAD * 2;
const ACCENT = "#2f4a34";
const MUTED = "#6b7266";
const INK = "#23291f";
const MAX_ROWS = 120; // hard cap so the canvas can't blow past mobile limits

const FONT = (s: string) => `${s} 'IBM Plex Sans', system-ui, sans-serif`;

// ---- a step = a strip of vertical space + how to paint it -----------
type Step = { h: number; paint: (ctx: CanvasRenderingContext2D, y: number) => void };

function textWidth(ctx: CanvasRenderingContext2D, font: string, s: string) {
  ctx.font = font;
  return ctx.measureText(s).width;
}

/** Wrap `text` to `maxW`, hard-breaking any single token that still overflows. */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  font: string,
  text: string,
  maxW: number,
): string[] {
  ctx.font = font;
  const out: string[] = [];
  const paras = String(text).replace(/\r\n?/g, "\n").split("\n");
  for (const para of paras) {
    if (para.trim() === "") continue;
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      let w = word;
      // hard-break a token wider than the whole body
      while (ctx.measureText(w).width > maxW && w.length > 1) {
        let cut = w.length;
        while (cut > 1 && ctx.measureText(w.slice(0, cut)).width > maxW) cut--;
        const head = w.slice(0, cut);
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(head);
        w = w.slice(cut);
      }
      const test = line ? `${line} ${w}` : w;
      if (line && ctx.measureText(test).width > maxW) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [""];
}

function ellipsize(
  ctx: CanvasRenderingContext2D,
  font: string,
  s: string,
  maxW: number,
): string {
  ctx.font = font;
  if (ctx.measureText(s).width <= maxW) return s;
  let out = s;
  while (out.length > 1 && ctx.measureText(out + "…").width > maxW)
    out = out.slice(0, -1);
  return out + "…";
}

function loadIcon(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // A premium logo comes from Supabase Storage (a different origin); ask
    // for a CORS-clean copy so it doesn't taint the canvas and block
    // toBlob(). The default /icon.svg is same-origin and unaffected.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Build a shop receipt / order slip and return it as a PNG blob (2x). */
export async function receiptImage(spec: ReceiptSpec): Promise<Blob> {
  const accent = spec.brand || ACCENT;
  const icon =
    (spec.logoUrl ? await loadIcon(spec.logoUrl) : null) ??
    (await loadIcon("/icon.svg"));
  const m = document.createElement("canvas").getContext("2d");
  if (!m) throw new Error("canvas unavailable");

  const steps: Step[] = [];

  // logo
  if (icon) {
    const lw = 46;
    const lh = (icon.height / icon.width) * lw || 46;
    steps.push({
      h: lh + 8,
      paint: (ctx, y) => ctx.drawImage(icon, (W - lw) / 2, y, lw, lh),
    });
  }

  // shop name
  steps.push({
    h: 26,
    paint: (ctx, y) => {
      ctx.font = FONT("800 20px");
      ctx.fillStyle = accent;
      ctx.textAlign = "center";
      ctx.fillText(
        ellipsize(ctx, FONT("800 20px"), spec.shopName || APP_NAME, BODY),
        W / 2,
        y + 19,
      );
    },
  });

  if (spec.shopSub) {
    steps.push({
      h: 16,
      paint: (ctx, y) => {
        ctx.font = FONT("12px");
        ctx.fillStyle = MUTED;
        ctx.textAlign = "center";
        ctx.fillText(ellipsize(ctx, FONT("12px"), spec.shopSub!, BODY), W / 2, y + 12);
      },
    });
  }

  steps.push({ h: 12, paint: () => {} });
  steps.push({
    h: 2,
    paint: (ctx, y) => {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD, y + 1);
      ctx.lineTo(W - PAD, y + 1);
      ctx.stroke();
    },
  });
  steps.push({ h: 12, paint: () => {} });

  // heading + date on one baseline
  steps.push({
    h: 20,
    paint: (ctx, y) => {
      ctx.font = FONT("700 14px");
      ctx.fillStyle = accent;
      ctx.textAlign = "left";
      ctx.fillText(spec.heading, PAD, y + 14);
      if (spec.dateText) {
        ctx.font = FONT("12px");
        ctx.fillStyle = MUTED;
        ctx.textAlign = "right";
        ctx.fillText(spec.dateText, W - PAD, y + 14);
      }
    },
  });

  if (spec.party) {
    steps.push({
      h: 18,
      paint: (ctx, y) => {
        ctx.font = FONT("700 14px");
        ctx.fillStyle = INK;
        ctx.textAlign = "left";
        ctx.fillText(ellipsize(ctx, FONT("700 14px"), spec.party!, BODY), PAD, y + 14);
      },
    });
  }

  steps.push({ h: 8, paint: () => {} });
  steps.push({
    h: 1,
    paint: (ctx, y) => {
      ctx.strokeStyle = "#dddddd";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(W - PAD, y);
      ctx.stroke();
    },
  });
  steps.push({ h: 10, paint: () => {} });

  if (spec.items && spec.items.length) {
    // ITEM / QTY / RATE / AMOUNT table.
    const qtyW = Math.round(BODY * 0.16);
    const rateW = Math.round(BODY * 0.22);
    const amtW = Math.round(BODY * 0.24);
    const itemW = BODY - qtyW - rateW - amtW;
    const qtyRight = PAD + itemW + qtyW;
    const rateRight = qtyRight + rateW;
    const amtRight = W - PAD;
    const headFont = FONT("700 10px");
    const nameFont = FONT("14px");
    const numFont = FONT("13px");

    steps.push({
      h: 24,
      paint: (ctx, y) => {
        ctx.fillStyle = "#f2f1ec";
        ctx.fillRect(PAD - 8, y, BODY + 16, 24);
        ctx.font = headFont;
        ctx.fillStyle = MUTED;
        ctx.textAlign = "left";
        ctx.fillText("ITEM", PAD, y + 15);
        ctx.textAlign = "right";
        ctx.fillText("QTY", qtyRight, y + 15);
        ctx.fillText("RATE", rateRight, y + 15);
        ctx.fillText("AMOUNT", amtRight, y + 15);
      },
    });

    const items = spec.items.slice(0, MAX_ROWS);
    for (const it of items) {
      const lines = wrapLines(m, nameFont, it.name, itemW - 10);
      const h = Math.max(lines.length * 19, 19) + 14;
      steps.push({
        h,
        paint: (ctx, y) => {
          ctx.font = nameFont;
          ctx.fillStyle = INK;
          ctx.textAlign = "left";
          let ly = y + 16;
          for (const ln of lines) {
            ctx.fillText(ln, PAD, ly);
            ly += 19;
          }
          ctx.font = numFont;
          ctx.fillStyle = MUTED;
          ctx.textAlign = "right";
          ctx.fillText(it.qty, qtyRight, y + 16);
          ctx.fillText(it.rate, rateRight, y + 16);
          ctx.fillStyle = INK;
          ctx.fillText(it.amount, amtRight, y + 16);
          ctx.strokeStyle = "#e8e7e1";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, y + h - 1);
          ctx.lineTo(W - PAD, y + h - 1);
          ctx.stroke();
        },
      });
    }
    if (spec.items.length > MAX_ROWS) {
      steps.push({
        h: 20,
        paint: (ctx, y) => {
          ctx.font = FONT("12px");
          ctx.fillStyle = MUTED;
          ctx.textAlign = "left";
          ctx.fillText(`+ ${spec.items!.length - MAX_ROWS} more…`, PAD, y + 14);
        },
      });
    }
  } else if (spec.qtyItems && spec.qtyItems.length) {
    // ITEM / QTY table only — no rate or amount column, for a supplier-
    // facing order slip that must not show any price.
    const qtyW = Math.round(BODY * 0.24);
    const itemW = BODY - qtyW;
    const qtyRight = W - PAD;
    const headFont = FONT("700 10px");
    const nameFont = FONT("14px");
    const numFont = FONT("13px");

    steps.push({
      h: 24,
      paint: (ctx, y) => {
        ctx.fillStyle = "#f2f1ec";
        ctx.fillRect(PAD - 8, y, BODY + 16, 24);
        ctx.font = headFont;
        ctx.fillStyle = MUTED;
        ctx.textAlign = "left";
        ctx.fillText("ITEM", PAD, y + 15);
        ctx.textAlign = "right";
        ctx.fillText("QTY", qtyRight, y + 15);
      },
    });

    const qtyItems = spec.qtyItems.slice(0, MAX_ROWS);
    for (const it of qtyItems) {
      const lines = wrapLines(m, nameFont, it.name, itemW - 10);
      const h = Math.max(lines.length * 19, 19) + 14;
      steps.push({
        h,
        paint: (ctx, y) => {
          ctx.font = nameFont;
          ctx.fillStyle = INK;
          ctx.textAlign = "left";
          let ly = y + 16;
          for (const ln of lines) {
            ctx.fillText(ln, PAD, ly);
            ly += 19;
          }
          ctx.font = numFont;
          ctx.fillStyle = MUTED;
          ctx.textAlign = "right";
          ctx.fillText(it.qty, qtyRight, y + 16);
          ctx.strokeStyle = "#e8e7e1";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, y + h - 1);
          ctx.lineTo(W - PAD, y + h - 1);
          ctx.stroke();
        },
      });
    }
    if (spec.qtyItems.length > MAX_ROWS) {
      steps.push({
        h: 20,
        paint: (ctx, y) => {
          ctx.font = FONT("12px");
          ctx.fillStyle = MUTED;
          ctx.textAlign = "left";
          ctx.fillText(`+ ${spec.qtyItems!.length - MAX_ROWS} more…`, PAD, y + 14);
        },
      });
    }
  } else {
    // Plain item lines — no rate/amount columns (e.g. a no-price order slip).
    const rowFont = FONT("15px");
    const rows = spec.rows.slice(0, MAX_ROWS);
    for (const r of rows) {
      const rightW = r.right ? textWidth(m, rowFont, r.right) + 14 : 0;
      const lines = wrapLines(m, rowFont, r.left, BODY - rightW);
      steps.push({
        h: lines.length * 20 + 6,
        paint: (ctx, y) => {
          ctx.font = rowFont;
          ctx.fillStyle = INK;
          if (r.right) {
            ctx.textAlign = "right";
            ctx.fillText(r.right, W - PAD, y + 15);
          }
          ctx.textAlign = "left";
          let ly = y + 15;
          for (const ln of lines) {
            ctx.fillText(ln, PAD, ly);
            ly += 20;
          }
        },
      });
    }
    if (spec.rows.length > MAX_ROWS) {
      steps.push({
        h: 20,
        paint: (ctx, y) => {
          ctx.font = FONT("12px");
          ctx.fillStyle = MUTED;
          ctx.textAlign = "left";
          ctx.fillText(`+ ${spec.rows.length - MAX_ROWS} more…`, PAD, y + 14);
        },
      });
    }
  }

  steps.push({ h: 8, paint: () => {} });
  steps.push({
    h: 1,
    paint: (ctx, y) => {
      ctx.strokeStyle = "#dddddd";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(W - PAD, y);
      ctx.stroke();
    },
  });
  steps.push({ h: 10, paint: () => {} });

  for (const trow of spec.totals ?? []) {
    steps.push({
      h: 22,
      paint: (ctx, y) => {
        ctx.font = trow.bold ? FONT("700 15px") : FONT("14px");
        ctx.fillStyle = trow.bold ? accent : INK;
        ctx.textAlign = "left";
        ctx.fillText(trow.label, PAD, y + 15);
        ctx.textAlign = "right";
        ctx.fillText(trow.value, W - PAD, y + 15);
      },
    });
  }

  if (spec.note && spec.note.trim()) {
    const noteLines = wrapLines(m, FONT("13px"), spec.note.trim(), BODY);
    steps.push({ h: 8, paint: () => {} });
    steps.push({
      h: noteLines.length * 17,
      paint: (ctx, y) => {
        ctx.font = FONT("13px");
        ctx.fillStyle = MUTED;
        ctx.textAlign = "left";
        let ly = y + 13;
        for (const ln of noteLines) {
          ctx.fillText(ln, PAD, ly);
          ly += 17;
        }
      },
    });
  }

  steps.push({ h: 18, paint: () => {} });
  steps.push({
    h: 14,
    paint: (ctx, y) => {
      ctx.font = FONT("11px");
      ctx.fillStyle = "#9aa39a";
      ctx.textAlign = "center";
      ctx.fillText(`${APP_NAME} · ${APP_URL}`, W / 2, y + 11);
    },
  });

  const H = Math.ceil(PAD * 2 + steps.reduce((s, st) => s + st.h, 0));
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  let y = PAD;
  for (const st of steps) {
    st.paint(ctx, y);
    y += st.h;
  }

  return new Promise<Blob>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("toBlob timeout")), 8000);
    canvas.toBlob((b) => {
      clearTimeout(to);
      if (b) resolve(b);
      else reject(new Error("toBlob failed"));
    }, "image/png");
  });
}

/** Share the image via the OS share sheet, or fall back to a download. */
export async function shareImage(
  blob: Blob,
  filename: string,
  title: string,
): Promise<"shared" | "downloaded"> {
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  try {
    if (typeof File === "function" && typeof navigator.share === "function") {
      const file = new File([blob], filename, { type: "image/png" });
      if (!nav.canShare || nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return "shared";
      }
    }
  } catch (e) {
    // user dismissed the sheet — treat as done, don't also download
    if (e instanceof Error && e.name === "AbortError") return "shared";
    // any other failure → fall through to the download path
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
