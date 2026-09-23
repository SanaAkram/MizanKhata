"use client";

import * as pdfjs from "pdfjs-dist";

// Served from /public — most reliable across bundlers. Keep this file in sync
// with the installed pdfjs-dist version (copied on install).
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type TextItem = { str: string; transform: number[] };

// Exact column-header labels Digikhata repeats on every page of a statement
// table. Dropped so they never get swept into an entry's note (see below).
const HEADER_DENYLIST = new Set([
  "#",
  "Date",
  "Details",
  "Purchase",
  "Payment",
  "Balance",
  "Debit (-)",
  "Credit (+)",
]);

/**
 * Extract the text of a Digikhata statement PDF as one token per line, in
 * the PDF's original content-stream order — NOT grouped by on-page position.
 *
 * Why: Digikhata's table cells are emitted one-fragment-per-column, and a
 * wrapped "Details" cell spans several fragments at different y-positions
 * within the same row. Grouping fragments by y (as a naive "reconstruct
 * lines from a page" pass would) interleaves those wrapped lines with the
 * row's Purchase/Payment/Balance figures — which sit at their own, different
 * y — and scrambles column order. The content-stream order doesn't have that
 * problem: it walks the table strictly column-by-column, row-by-row, so a
 * multi-line note (even one that spans a page break) comes out as a
 * sequence of note fragments followed by its amount(s), unmangled. This is
 * what `digikhata.ts`'s row scanner is written to expect.
 *
 * The brand header/footer bar (present on every page) is dropped by y-band,
 * and the repeated table header row is dropped by exact text match.
 */
export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const pageHeight = page.view[3];
    const content = await page.getTextContent();
    const items = (content.items as TextItem[]).filter(
      (i) => typeof i.str === "string",
    );

    for (const it of items) {
      const y = it.transform[5];
      // Brand bar at the top, "Start using Digikhata / Help:" bar at the
      // bottom — repeated on every page, never part of the table.
      if (y > pageHeight - 45 || y < 45) continue;
      const s = it.str.replace(/\s+/g, " ").trim();
      if (!s || HEADER_DENYLIST.has(s)) continue;
      out.push(s);
    }
  }

  await doc.destroy();
  return out.join("\n");
}
