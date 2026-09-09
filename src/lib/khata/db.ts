import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

export type Customer =
  Database["public"]["Tables"]["shop_customers"]["Row"];
export type Supplier =
  Database["public"]["Tables"]["shop_suppliers"]["Row"];
export type KhataTx = Database["public"]["Tables"]["shop_khata_tx"]["Row"];
export type SupplierTx =
  Database["public"]["Tables"]["shop_supplier_tx"]["Row"];
export type Cash = Database["public"]["Tables"]["shop_cashbook"]["Row"];

export type PartyKind = "customer" | "supplier";
export type TxType = "credit" | "payment";

/** A customer or supplier, unified for the Digikhata-style party list. */
export type Party = {
  id: string;
  kind: PartyKind;
  name: string;
  phone: string | null;
  balance: number; // customer: they owe us. supplier: we owe them.
};

// ---- reads --------------------------------------------------------------

export async function fetchCustomers(db: DB): Promise<Customer[]> {
  const { data, error } = await db
    .from("shop_customers")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchSuppliers(db: DB): Promise<Supplier[]> {
  const { data, error } = await db
    .from("shop_suppliers")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchKhataTx(db: DB): Promise<KhataTx[]> {
  const { data, error } = await db
    .from("shop_khata_tx")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSupplierTx(db: DB): Promise<SupplierTx[]> {
  const { data, error } = await db
    .from("shop_supplier_tx")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCashbook(db: DB): Promise<Cash[]> {
  const { data, error } = await db
    .from("shop_cashbook")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---- balances ---------------------------------------------------------

const signed = (t: { type: string; amount: number }) =>
  (t.type === "credit" ? 1 : -1) * Number(t.amount || 0);

export function customerBalance(txs: KhataTx[], customerId: string): number {
  return txs
    .filter((t) => t.customer_id === customerId)
    .reduce((s, t) => s + signed(t), 0);
}

export function supplierBalance(txs: SupplierTx[], supplierId: string): number {
  return txs
    .filter((t) => t.supplier_id === supplierId)
    .reduce((s, t) => s + signed(t), 0);
}

export function cashInHand(cash: Cash[]): number {
  return cash.reduce(
    (s, e) => s + (e.type === "in" ? 1 : -1) * Number(e.amount || 0),
    0,
  );
}

/** Running balance for a party's history, oldest → newest. */
export function withRunningBalance<T extends { type: string; amount: number }>(
  txsOldestFirst: T[],
): Array<T & { running: number }> {
  let run = 0;
  return txsOldestFirst.map((t) => {
    run += signed(t);
    return { ...t, running: run };
  });
}

export function buildParties(
  customers: Customer[],
  suppliers: Supplier[],
  khataTx: KhataTx[],
  supplierTx: SupplierTx[],
): Party[] {
  const c: Party[] = customers.map((x) => ({
    id: x.id,
    kind: "customer",
    name: x.name,
    phone: x.phone,
    balance: customerBalance(khataTx, x.id),
  }));
  const s: Party[] = suppliers.map((x) => ({
    id: x.id,
    kind: "supplier",
    name: x.name,
    phone: x.phone,
    balance: supplierBalance(supplierTx, x.id),
  }));
  return [...c, ...s].sort((a, b) => b.balance - a.balance);
}

// ---- writes ----------------------------------------------------------

export async function addPartyTx(
  db: DB,
  kind: PartyKind,
  partyId: string,
  row: {
    id: string;
    type: TxType;
    amount: number;
    note?: string | null;
    ref?: string | null;
    date: string;
  },
): Promise<void> {
  if (kind === "customer") {
    const { error } = await db.from("shop_khata_tx").insert({
      id: row.id,
      customer_id: partyId,
      type: row.type,
      amount: row.amount,
      note: row.note ?? null,
      ref: row.ref ?? null,
      date: row.date,
    });
    if (error) throw error;
  } else {
    const { error } = await db.from("shop_supplier_tx").insert({
      id: row.id,
      supplier_id: partyId,
      type: row.type,
      amount: row.amount,
      note: row.note ?? null,
      ref: row.ref ?? null,
      date: row.date,
    });
    if (error) throw error;
  }
}

export async function updatePartyTx(
  db: DB,
  kind: PartyKind,
  id: string,
  patch: { amount?: number; note?: string | null; date?: string },
): Promise<void> {
  const table = kind === "customer" ? "shop_khata_tx" : "shop_supplier_tx";
  const { error } = await db.from(table).update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePartyTx(
  db: DB,
  kind: PartyKind,
  id: string,
): Promise<void> {
  const table = kind === "customer" ? "shop_khata_tx" : "shop_supplier_tx";
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function addCash(
  db: DB,
  row: {
    id: string;
    type: "in" | "out";
    amount: number;
    note?: string | null;
    partyType?: string | null;
    partyId?: string | null;
    partyName?: string | null;
    date: string;
  },
): Promise<void> {
  const { error } = await db.from("shop_cashbook").insert({
    id: row.id,
    type: row.type,
    amount: row.amount,
    note: row.note ?? null,
    party_type: row.partyType ?? null,
    party_id: row.partyId ?? null,
    party_name: row.partyName ?? null,
    date: row.date,
  });
  if (error) throw error;
}

export async function deleteCash(db: DB, id: string): Promise<void> {
  const { error } = await db.from("shop_cashbook").delete().eq("id", id);
  if (error) throw error;
}

export async function createParty(
  db: DB,
  kind: PartyKind,
  row: { id: string; name: string; phone?: string | null },
): Promise<void> {
  const table = kind === "customer" ? "shop_customers" : "shop_suppliers";
  const { error } = await db
    .from(table)
    .insert({ id: row.id, name: row.name, phone: row.phone ?? null });
  if (error) throw error;
}
