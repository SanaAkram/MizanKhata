import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { newId } from "@/lib/ids";
import {
  SEED_BHAI_ENTRIES,
  SEED_BHAI_NET,
  SEED_CUSTOMERS,
  SEED_PRODUCTS,
  SEED_SUPPLIERS,
} from "./seed-data";

type DB = SupabaseClient<Database>;
type SupTxInsert =
  Database["public"]["Tables"]["shop_supplier_tx"]["Insert"];

const DAY = 86_400_000;
const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * DAY).toISOString();

/**
 * Loads Mubeen's Digikhata sample data (customers, suppliers, products, and
 * opening balances) for the signed-in user. Call only when the khata is empty.
 */
export async function seedKhata(db: DB): Promise<{
  customers: number;
  suppliers: number;
  products: number;
}> {
  const custRows = SEED_CUSTOMERS.map((c) => ({
    id: newId("c_"),
    name: c.name,
    phone: c.phone ?? null,
  }));
  const supRows = SEED_SUPPLIERS.map((s) => ({
    id: newId("s_"),
    name: s.name,
    phone: s.phone ?? null,
  }));
  const prodRows = SEED_PRODUCTS.map((p) => ({
    id: newId("p_"),
    name: p.name,
    unit: p.unit,
    sale_price: p.salePrice,
    stock: p.stock,
  }));

  let res = await db.from("shop_customers").insert(custRows);
  if (res.error) throw res.error;
  res = await db.from("shop_suppliers").insert(supRows);
  if (res.error) throw res.error;
  res = await db.from("shop_products").insert(prodRows);
  if (res.error) throw res.error;

  const khataTx = custRows
    .map((row, i) => ({
      id: newId("kt_"),
      customer_id: row.id,
      type: "credit",
      amount: SEED_CUSTOMERS[i].balance,
      note: "Opening balance (from Digikhata)",
      date: iso(60),
    }))
    .filter((t) => t.amount > 0);
  if (khataTx.length) {
    res = await db.from("shop_khata_tx").insert(khataTx);
    if (res.error) throw res.error;
  }

  const supTx: SupTxInsert[] = [];
  supRows.forEach((row, i) => {
    const seed = SEED_SUPPLIERS[i];
    const isBhai = seed.name === "Bhai";
    const opening = isBhai ? seed.balance - SEED_BHAI_NET : seed.balance;
    if (Math.abs(opening) > 0.005) {
      supTx.push({
        id: newId("st_"),
        supplier_id: row.id,
        type: opening >= 0 ? "credit" : "payment",
        amount: Math.round(Math.abs(opening) * 100) / 100,
        note: "Opening balance (from Digikhata)",
        date: iso(60),
      });
    }
    if (isBhai) {
      SEED_BHAI_ENTRIES.forEach((e) => {
        supTx.push({
          id: newId("st_"),
          supplier_id: row.id,
          type: e.type,
          amount: e.amount,
          note: e.note || null,
          date: iso(e.daysAgo),
        });
      });
    }
  });
  if (supTx.length) {
    res = await db.from("shop_supplier_tx").insert(supTx);
    if (res.error) throw res.error;
  }

  return {
    customers: custRows.length,
    suppliers: supRows.length,
    products: prodRows.length,
  };
}
