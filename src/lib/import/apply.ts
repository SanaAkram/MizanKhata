"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { newId } from "@/lib/ids";
import type { CashImport, PartyImport } from "./digikhata";

type DB = SupabaseClient<Database>;
type KhataInsert = Database["public"]["Tables"]["shop_khata_tx"]["Insert"];
type SupInsert = Database["public"]["Tables"]["shop_supplier_tx"]["Insert"];
type CashInsert = Database["public"]["Tables"]["shop_cashbook"]["Insert"];

export type ApplyResult = { added: number; skipped: number; error?: string };

/** Stable id so re-importing the same file can't create duplicates. */
const rid = (fileKey: string, tag: string | number) =>
  `dk_${fileKey}_${tag}`.replace(/[^a-z0-9_]/gi, "").slice(0, 60);

async function findPartyId(
  db: DB,
  bid: string,
  kind: "customer" | "supplier",
  name: string,
  phone: string | null,
): Promise<string | null> {
  const table = kind === "customer" ? "shop_customers" : "shop_suppliers";
  if (phone) {
    const { data } = await db
      .from(table)
      .select("id")
      .eq("business_id", bid)
      .eq("phone", phone)
      .limit(1);
    if (data && data[0]) return data[0].id;
  }
  const { data } = await db.from(table).select("id,name").eq("business_id", bid);
  const hit = (data ?? []).find(
    (r) => r.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  return hit?.id ?? null;
}

type PlainRow = {
  id: string;
  business_id: string;
  type: string;
  amount: number;
  note: string;
  ref: string;
  date: string;
};

export async function applyPartyImport(
  db: DB,
  bid: string,
  fileKey: string,
  p: PartyImport,
): Promise<ApplyResult> {
  const isCust = p.partyKind === "customer";

  let partyId = await findPartyId(db, bid, p.partyKind, p.name, p.phone);
  if (!partyId) {
    partyId = newId(isCust ? "c_" : "s_");
    const ins = await db
      .from(isCust ? "shop_customers" : "shop_suppliers")
      .insert({ id: partyId, business_id: bid, name: p.name, phone: p.phone });
    if (ins.error) return { added: 0, skipped: 0, error: ins.error.message };
  }

  const base: PlainRow[] = [];
  if (p.openingBalance > 0) {
    base.push({
      id: rid(fileKey, "opening"),
      business_id: bid,
      type: "credit",
      amount: p.openingBalance,
      note: "Opening balance (Digikhata)",
      ref: `dk:${fileKey}:opening`,
      date: p.entries[0]?.date ?? new Date().toISOString(),
    });
  }
  for (const e of p.entries) {
    base.push({
      id: rid(fileKey, e.row),
      business_id: bid,
      type: e.type,
      amount: e.amount,
      note: e.note,
      ref: `dk:${fileKey}:${e.row}`,
      date: e.date,
    });
  }

  let added = 0;
  for (let i = 0; i < base.length; i += 200) {
    const chunk = base.slice(i, i + 200);
    let error: { message: string } | null = null;
    let count = 0;
    if (isCust) {
      const rows: KhataInsert[] = chunk.map((r) => ({
        ...r,
        customer_id: partyId!,
      }));
      const res = await db
        .from("shop_khata_tx")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
        .select("id");
      error = res.error;
      count = res.data?.length ?? 0;
    } else {
      const rows: SupInsert[] = chunk.map((r) => ({
        ...r,
        supplier_id: partyId!,
      }));
      const res = await db
        .from("shop_supplier_tx")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
        .select("id");
      error = res.error;
      count = res.data?.length ?? 0;
    }
    if (error)
      return { added, skipped: base.length - added, error: error.message };
    added += count;
  }
  return { added, skipped: base.length - added };
}

export async function applyCashImport(
  db: DB,
  bid: string,
  fileKey: string,
  c: CashImport,
): Promise<ApplyResult> {
  const rows: CashInsert[] = [];

  if (c.openingCash !== 0) {
    rows.push({
      id: rid(fileKey, "opening"),
      business_id: bid,
      type: c.openingCash > 0 ? "in" : "out",
      amount: Math.abs(c.openingCash),
      note: "Opening cash (Digikhata)",
      method: "cash",
      category: "opening",
      date: c.days[0]?.date ?? new Date().toISOString(),
    });
  }
  c.days.forEach((d, i) => {
    if (d.in > 0)
      rows.push({
        id: rid(fileKey, `in${i}`),
        business_id: bid,
        type: "in",
        amount: d.in,
        note: "Daily total (Digikhata)",
        method: "cash",
        category: "other",
        date: d.date,
      });
    if (d.out > 0)
      rows.push({
        id: rid(fileKey, `out${i}`),
        business_id: bid,
        type: "out",
        amount: d.out,
        note: "Daily total (Digikhata)",
        method: "cash",
        category: "other",
        date: d.date,
      });
  });

  let added = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const res = await db
      .from("shop_cashbook")
      .upsert(chunk, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (res.error)
      return { added, skipped: rows.length - added, error: res.error.message };
    added += res.data?.length ?? 0;
  }
  return { added, skipped: rows.length - added };
}
