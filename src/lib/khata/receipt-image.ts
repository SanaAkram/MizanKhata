"use client";

import { APP_NAME, APP_URL } from "@/lib/brand";

export type ReceiptRow = { left: string; right?: string };

export type ReceiptSpec = {
  shopName: string;
  shopSub?: string; // phone / address line
  heading: string; // "ORDER" or "BILL #12"
  party?: string; // customer / supplier name
  dateText?: string;
  rows: ReceiptRow[]; // item lines
  totals?: { label: string; value: string; bold?: boolean }[];
  note?: string | null;
  brand?: string; // hex accent
};

const W = 480;
const PAD = 28;
const ACCENT_DEFAULT = "#2f4a34";

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string[] {
  const out: string[] = [];
  for (const para of String(text).split("\n")) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

/** Draw a shop receipt / order slip to a PNG blob (2x for retina). */
export async function receiptImage(spec: ReceiptSpec): Promise<Blob> {
  const accent = spec.brand || ACCENT_DEFAULT;
  const scale = 2;
  const measure = document.createElement("canvas").getContext("2d")!;
  const bodyW = W - PAD * 2;

  // ---- measure pass: compute total height ----
  let h = PAD;
  h += 30; // shop name
  if (spec.shopSub) h += 18;
  h += 10;
  h += 2; // rule
  h += 14;
  h += 22; // heading row
  if (spec.party) h += 18;
  if (spec.dateText) h += 16;
  h += 12;
  h += 1; // rule
  h += 12;
  measure.font = "15px system-ui, sans-serif";
  for (const r of spec.rows) {
    const rightW = r.right ? measure.measureText(r.right).width + 12 : 0;
    const lines = wrap(measure, r.left, bodyW - rightW);
    h += Math.max(1, lines.length) * 21 + 6;
  }
  h += 10;
  h += 1; // rule
  h += 12;
  if (spec.totals) h += spec.totals.length * 22;
  if (spec.note) {
    measure.font = "13px system-ui, sans-serif";
    h += wrap(measure, spec.note, bodyW).length * 17 + 10;
  }
  h += 16;
  h += 14; // footer
  h += PAD;

  // ---- draw pass ----
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = Math.ceil(h) * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, h);
  ctx.textBaseline = "alphabetic";

  let y = PAD + 20;
  ctx.fillStyle = accent;
  ctx.font = "800 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(spec.shopName || APP_NAME, W / 2, y);
  y += 10;
  if (spec.shopSub) {
    ctx.fillStyle = "#6b7266";
    ctx.font = "12px system-ui, sans-serif";
    y += 14;
    ctx.fillText(spec.shopSub, W / 2, y);
  }
  y += 16;

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 22;

  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = "700 15px system-ui, sans-serif";
  ctx.fillText(spec.heading, PAD, y);
  if (spec.dateText) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#6b7266";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(spec.dateText, W - PAD, y);
  }
  y += 18;
  if (spec.party) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#23291f";
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.fillText(spec.party, PAD, y);
    y += 14;
  }
  y += 10;

  ctx.strokeStyle = "#dddddd";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 20;

  ctx.font = "15px system-ui, sans-serif";
  for (const r of spec.rows) {
    ctx.fillStyle = "#23291f";
    ctx.textAlign = "right";
    const rightW = r.right ? ctx.measureText(r.right).width + 12 : 0;
    if (r.right) ctx.fillText(r.right, W - PAD, y);
    ctx.textAlign = "left";
    for (const ln of wrap(ctx, r.left, bodyW - rightW)) {
      ctx.fillText(ln, PAD, y);
      y += 21;
    }
    y += 6;
  }

  y += 4;
  ctx.strokeStyle = "#dddddd";
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 20;

  if (spec.totals) {
    for (const trow of spec.totals) {
      ctx.font = trow.bold
        ? "700 15px system-ui, sans-serif"
        : "14px system-ui, sans-serif";
      ctx.fillStyle = trow.bold ? accent : "#23291f";
      ctx.textAlign = "left";
      ctx.fillText(trow.label, PAD, y);
      ctx.textAlign = "right";
      ctx.fillText(trow.value, W - PAD, y);
      y += 22;
    }
  }

  if (spec.note) {
    y += 6;
    ctx.fillStyle = "#6b7266";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "left";
    for (const ln of wrap(ctx, spec.note, bodyW)) {
      ctx.fillText(ln, PAD, y);
      y += 17;
    }
  }

  y += 20;
  ctx.fillStyle = "#9aa39a";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${APP_NAME} · ${APP_URL}`, W / 2, y);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

/** Share the image via the OS share sheet, or fall back to a download. */
export async function shareImage(
  blob: Blob,
  filename: string,
  title: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (d: unknown) => boolean;
  };
  if (nav.canShare?.({ files: [file] }) && typeof navigator.share === "function") {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch {
      return "shared"; // user cancelled — don't also download
    }
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
