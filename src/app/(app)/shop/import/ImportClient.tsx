"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtRs } from "@/lib/format";
import { toast } from "@/lib/toast";
import { extractPdfText } from "@/lib/import/pdf";
import {
  mergePartyImports,
  parseDigikhata,
  partyGroupKey,
  type MergedPartyImport,
  type ParseResult,
  type PartyImport,
} from "@/lib/import/digikhata";
import {
  applyCashImport,
  applyMergedPartyImport,
  applyPartyImport,
  applyStockImport,
  type ApplyResult,
} from "@/lib/import/apply";

type Job = {
  name: string;
  key: string;
  parsed?: ParseResult;
  parseError?: string;
  /** Asked for when the PDF doesn't say whether the party is a customer or supplier. */
  chosenKind?: "customer" | "supplier";
  result?: ApplyResult;
};

const fileKey = (n: string) =>
  n.replace(/\.pdf$/i, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);

/** The parsed file with what the PDF left open filled in: the party kind the
 *  user picked, and the file name when the statement had no readable name. */
function ready(j: Job): ParseResult | undefined {
  const p = j.parsed;
  if (!p || p.format !== "party") return p;
  const partyKind = p.partyKind ?? j.chosenKind ?? null;
  const name = p.name === "Unknown" ? j.name.replace(/\.pdf$/i, "") : p.name;
  return { ...p, partyKind, name };
}

function needsKind(j: Job): boolean {
  const r = ready(j);
  return r?.format === "party" && !r.partyKind;
}

export default function ImportClient({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [groupResults, setGroupResults] = useState<Record<string, ApplyResult>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setDone(false);
    const next: Job[] = [];
    for (const file of Array.from(list)) {
      const j: Job = { name: file.name, key: fileKey(file.name) };
      try {
        const text = await extractPdfText(file);
        j.parsed = parseDigikhata(text);
      } catch {
        j.parseError = "Could not read this PDF.";
      }
      next.push(j);
    }
    setJobs((cur) => [...cur, ...next]);
  }

  function chooseKind(key: string, kind: "customer" | "supplier") {
    setJobs((cur) => cur.map((x) => (x.key === key ? { ...x, chosenKind: kind } : x)));
  }

  // A statement over 1,000 entries has to be exported from Digikhata as
  // several date-range PDFs — group any files that parsed to the same
  // customer/supplier so they're reviewed and imported as one dataset
  // instead of one-at-a-time.
  const groups = useMemo(() => {
    const map = new Map<string, { job: Job; parsed: PartyImport }[]>();
    for (const j of jobs) {
      const r = ready(j);
      if (r?.format !== "party" || !r.partyKind) continue;
      const key = partyGroupKey(r);
      const arr = map.get(key) ?? [];
      arr.push({ job: j, parsed: r });
      map.set(key, arr);
    }
    return map;
  }, [jobs]);

  const groupOfJob = useMemo(() => {
    const m = new Map<Job, string>();
    for (const [key, items] of groups) {
      if (items.length < 2) continue;
      for (const { job } of items) m.set(job, key);
    }
    return m;
  }, [groups]);

  const seenGroups = new Set<string>();

  async function runImport() {
    if (!businessId) return;
    setBusy(true);
    const updated = [...jobs];
    const newGroupResults = { ...groupResults };
    let total = 0;

    for (const [key, items] of groups) {
      if (items.length < 2 || newGroupResults[key]) continue;
      const merged = mergePartyImports(
        items.map(({ job, parsed }) => ({ fileKey: job.key, parsed })),
      );
      try {
        newGroupResults[key] = await applyMergedPartyImport(
          supabase,
          businessId,
          merged,
        );
      } catch {
        newGroupResults[key] = { added: 0, skipped: 0, error: "Import failed." };
      }
      total += newGroupResults[key].added;
      setGroupResults({ ...newGroupResults });
    }

    for (const j of updated) {
      const r = ready(j);
      if (!r || r.format === "unknown" || j.result) continue;
      if (r.format === "party" && !r.partyKind) continue; // waiting for customer/supplier
      if (groupOfJob.has(j)) continue; // handled above, as part of its group
      try {
        if (r.format === "party") {
          j.result = await applyPartyImport(supabase, businessId, j.key, r);
        } else if (r.format === "cash") {
          j.result = await applyCashImport(supabase, businessId, j.key, r);
        } else if (r.format === "stock") {
          j.result = await applyStockImport(supabase, businessId, r.items);
        }
      } catch {
        j.result = { added: 0, skipped: 0, error: "Import failed." };
      }
      if (j.result) total += j.result.added;
      setJobs([...updated]);
    }

    setBusy(false);
    setDone(true);
    toast(`${total} entries imported.`, "success");
  }

  const importable =
    jobs.filter((j) => {
      const r = ready(j);
      return (
        r &&
        r.format !== "unknown" &&
        !j.result &&
        !groupOfJob.has(j) &&
        !(r.format === "party" && !r.partyKind)
      );
    }).length +
    [...groups.entries()].filter(
      ([key, items]) => items.length >= 2 && !groupResults[key],
    ).length;

  const awaitingKind = jobs.filter(needsKind).length;

  function renderMergedSummary(merged: MergedPartyImport, fileNames: string[]) {
    const entryCount = merged.parts.reduce((s, p) => s + p.entries.length, 0);
    return (
      <>
        <p className="mt-0.5 text-xs text-muted">
          <span className="font-semibold capitalize text-ink">
            {merged.partyKind}
          </span>{" "}
          · {merged.name} · {fileNames.length} files · {entryCount} entries ·{" "}
          <span className={merged.ok ? "text-ok" : "text-danger"}>
            closing {fmtRs(merged.derivedNet)}{" "}
            {merged.ok ? "✓" : `✗ (PDFs say ${fmtRs(merged.statedNet)})`}
          </span>
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted">
          {fileNames.join(", ")}
        </p>
        {merged.continuityGaps.length > 0 ? (
          <p className="mt-1 text-xs font-semibold text-danger">
            These files don&apos;t line up end-to-end — check the date ranges
            exported from Digikhata for gaps or overlaps.
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/settings/business" className="text-sm text-muted">
        ‹ Business settings
      </Link>

      <div>
        <h1 className="numeric text-xl font-semibold text-forest">
          Import from Digikhata
        </h1>
        <p className="mt-1 text-sm text-muted">
          Works for a party statement, the cash book, or a stock list (items
          with their stock in hand) — in English, Urdu or Roman Urdu. Open it
          in Digikhata, download the PDF, and add it here. It imports into{" "}
          <b>{businessName}</b>. If a party has more than 1,000 entries, add all
          of that party&apos;s files together and they&apos;ll be combined into
          one import. Nothing is saved until you tap Import, and the same file
          can&apos;t double up.
        </p>
      </div>

      <button
        onClick={() => fileRef.current?.click()}
        className="rounded-xl border border-dashed border-line bg-card px-4 py-6 text-sm font-semibold text-forest"
      >
        + Choose Digikhata PDF files
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {jobs.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {jobs.map((j, i) => {
            const groupKey = groupOfJob.get(j);
            if (groupKey) {
              if (seenGroups.has(groupKey)) return null;
              seenGroups.add(groupKey);
              const items = groups.get(groupKey)!;
              const merged = mergePartyImports(
                items.map(({ job, parsed }) => ({ fileKey: job.key, parsed })),
              );
              const result = groupResults[groupKey];
              return (
                <li
                  key={groupKey}
                  className="rounded-xl border border-line bg-card px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-ink">
                    {merged.name} (combined)
                  </p>
                  {renderMergedSummary(
                    merged,
                    items.map(({ job }) => job.name),
                  )}
                  {result ? (
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        result.error ? "text-danger" : "text-ok"
                      }`}
                    >
                      {result.error
                        ? result.error
                        : `Added ${result.added}${
                            result.skipped
                              ? `, skipped ${result.skipped} (already there)`
                              : ""
                          }`}
                    </p>
                  ) : null}
                </li>
              );
            }

            const r = ready(j);
            return (
              <li
                key={i}
                className="rounded-xl border border-line bg-card px-4 py-3 text-sm"
              >
                <p className="truncate font-semibold text-ink">{j.name}</p>
                {j.parseError ? (
                  <p className="mt-0.5 text-xs text-danger">{j.parseError}</p>
                ) : r?.format === "unknown" ? (
                  <p className="mt-0.5 text-xs text-danger">{r.hint}</p>
                ) : r?.format === "party" ? (
                  <>
                    <p className="mt-0.5 text-xs text-muted">
                      {r.partyKind ? (
                        <span className="font-semibold capitalize text-ink">
                          {r.partyKind}
                        </span>
                      ) : (
                        <span className="font-semibold text-danger">
                          Customer or supplier?
                        </span>
                      )}{" "}
                      · {r.name} · {r.entries.length} entries ·{" "}
                      <span className={r.ok ? "text-ok" : "text-danger"}>
                        closing {fmtRs(r.derivedNet)}{" "}
                        {r.ok ? "✓" : `✗ (PDF says ${fmtRs(r.statedNet)})`}
                      </span>
                    </p>
                    {needsKind(j) ? (
                      <div className="mt-2 flex gap-2">
                        {(["customer", "supplier"] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => chooseKind(j.key, k)}
                            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold capitalize ${
                              j.chosenKind === k
                                ? "border-forest bg-forest text-paper"
                                : "border-line text-forest"
                            }`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : r?.format === "cash" ? (
                  <p className="mt-0.5 text-xs text-muted">
                    Cash book · opening {fmtRs(r.openingCash)} ·{" "}
                    {r.days.length} day
                    {r.days.length === 1 ? "" : "s"} with activity
                  </p>
                ) : r?.format === "stock" ? (
                  <p className="mt-0.5 text-xs text-muted">
                    Stock list · {r.items.length} items ·{" "}
                    {r.items.reduce((s, it) => s + it.qty, 0).toLocaleString("en-US")}{" "}
                    in stock
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted">Reading…</p>
                )}

                {j.result ? (
                  <p
                    className={`mt-1 text-xs font-semibold ${
                      j.result.error ? "text-danger" : "text-ok"
                    }`}
                  >
                    {j.result.error
                      ? j.result.error
                      : `Added ${j.result.added}${
                          j.result.skipped
                            ? `, skipped ${j.result.skipped} (already there)`
                            : ""
                        }`}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {awaitingKind > 0 ? (
        <p className="text-xs font-semibold text-danger">
          Pick customer or supplier for {awaitingKind} file
          {awaitingKind === 1 ? "" : "s"} above to import {awaitingKind === 1 ? "it" : "them"}.
        </p>
      ) : null}

      {importable > 0 ? (
        <button
          onClick={runImport}
          disabled={busy}
          className="rounded-xl bg-forest px-4 py-3.5 text-sm font-semibold text-paper disabled:opacity-60"
        >
          {busy
            ? "Importing…"
            : `Import ${importable} file${importable === 1 ? "" : "s"}`}
        </button>
      ) : null}

      {done ? (
        <div className="flex gap-2">
          <Link
            href="/ledger"
            className="flex-1 rounded-xl border border-line px-4 py-3 text-center text-sm font-semibold text-forest"
            onClick={() => router.refresh()}
          >
            Open ledger
          </Link>
          <Link
            href="/cashbook"
            className="flex-1 rounded-xl border border-line px-4 py-3 text-center text-sm font-semibold text-forest"
          >
            Open cash book
          </Link>
        </div>
      ) : null}
    </div>
  );
}
