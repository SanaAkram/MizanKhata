"use client";

import * as pdfjs from "pdfjs-dist";

// Served from /public — most reliable across bundlers. Keep this file in sync
// with the installed pdfjs-dist version (copied on install).
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type TextItem = { str: string; transform: number[] };

/**
 * Extract the visible text of a PDF as newline-separated lines, reconstructed
 * from item positions (pdf.js gives x/y per fragment, not lines).
 */
export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = (content.items as TextItem[]).filter(
      (i) => typeof i.str === "string",
    );

    // group fragments into lines by rounded y
    const lines = new Map<number, { x: number; s: string }[]>();
    for (const it of items) {
      const x = it.transform[4];
      const y = Math.round(it.transform[5]);
      const arr = lines.get(y) ?? [];
      arr.push({ x, s: it.str });
      lines.set(y, arr);
    }

    const ys = [...lines.keys()].sort((a, b) => b - a); // top → bottom
    for (const y of ys) {
      const frags = lines.get(y)!.sort((a, b) => a.x - b.x);
      const line = frags
        .map((f) => f.s)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) out.push(line);
    }
  }

  await doc.destroy();
  return out.join("\n");
}
