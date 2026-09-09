/**
 * Mock data for Mubeen, transcribed from his Digikhata (web.digikhata.pk)
 * dashboard / party list / stock book screenshots. Balances are what the
 * screenshots showed; used as opening balances when loading sample data.
 *
 * Digikhata totals for reference: Receivables ~Rs 3.6M, Payables ~Rs 3.9M,
 * 185 parties, 62 stock items, stock value ~Rs 680.7K.
 */

export type SeedParty = { name: string; phone?: string; balance: number };
export type SeedProduct = {
  name: string;
  unit: string;
  salePrice: number;
  stock: number;
};

// Customers — "you will get" (they owe Mubeen).
export const SEED_CUSTOMERS: SeedParty[] = [
  { name: "Subhan H/W", balance: 808145 },
  { name: "Mehboob H/W Saif Bhai Ahmadpur", balance: 399205 },
  { name: "Irfan Ahmad Nwaz H/W Multan", balance: 298800 },
  { name: "M.A H/w", balance: 282914 },
  { name: "Akil H/W", balance: 134475 },
  { name: "Ali Pipe H/w", balance: 33946 },
  { name: "Azeem H/w Guj", balance: 21600 },
  { name: "Nadeem H/w Guj", balance: 18960 },
  { name: "Madni H/w Guj", balance: 10000 },
  { name: "Mubeen Pindi H/w", balance: 20600 },
];

// Suppliers — "you will give" (Mubeen owes them).
export const SEED_SUPPLIERS: SeedParty[] = [
  { name: "Bhai", balance: 1454957.32 },
  { name: "Abdullah", balance: 372874.07 },
  { name: "bhai silver", balance: 227333.35 },
  { name: "Amjad Silver Dhlai", balance: 81792 },
  { name: "Billo Bhai", balance: 79165.16 },
  { name: "Mazer Sorak Mose", balance: 36756.45 },
  { name: "Hunana Box Maker", balance: 23478 },
  { name: "Umer Fectory Bshart Ali", balance: 5100 },
  { name: "Asim Mal Ksai", balance: 1500 },
  { name: "mal ksai", balance: 274 },
  { name: "Wahab Bhai H/W", balance: 0 },
];

// Stock items (name / unit / sale price / stock on hand).
export const SEED_PRODUCTS: SeedProduct[] = [
  { name: "pipe goli 5no", unit: "pcs", salePrice: 160, stock: 100 },
  { name: "115no bracket chrome", unit: "pcs", salePrice: 55, stock: 3000 },
  { name: "degi jumbo chrome", unit: "pcs", salePrice: 120, stock: 200 },
  { name: "china holder", unit: "pcs", salePrice: 42, stock: 2450 },
  { name: "aam loha sari ring", unit: "pcs", salePrice: 11.5, stock: 600 },
  { name: "degi T lacer", unit: "pcs", salePrice: 58, stock: 1250 },
  { name: "double T wazni", unit: "pcs", salePrice: 88, stock: 750 },
  { name: "degi silver T", unit: "pcs", salePrice: 35, stock: 2160 },
  { name: "degi silver T 39no", unit: "pcs", salePrice: 41, stock: 600 },
  { name: "degi silver T 48no", unit: "pcs", salePrice: 42, stock: 630 },
  { name: "chori SPT", unit: "dzn", salePrice: 230, stock: 36 },
  { name: "chori aam T", unit: "dzn", salePrice: 190, stock: 0 },
  { name: "degi T", unit: "pcs", salePrice: 57, stock: 0 },
  { name: "aam T", unit: "pcs", salePrice: 30, stock: 0 },
  { name: "goli killi 5no", unit: "pcs", salePrice: 90, stock: 0 },
  { name: "goli killi 7no", unit: "pcs", salePrice: 100, stock: 0 },
  { name: "oval pipe 7no", unit: "pcs", salePrice: 190, stock: 0 },
  { name: "chori 118no chrome", unit: "pcs", salePrice: 0, stock: 3550 },
  { name: "chori 119no", unit: "pcs", salePrice: 0, stock: 1500 },
  { name: "jumbo chrome", unit: "pcs", salePrice: 0, stock: 700 },
  { name: "clasick chrome", unit: "pcs", salePrice: 0, stock: 500 },
  { name: "super clasick", unit: "pcs", salePrice: 0, stock: 100 },
  { name: "cholah loha chrome", unit: "pcs", salePrice: 0, stock: 0 },
  { name: 'shelf 4"', unit: "pcs", salePrice: 0, stock: 800 },
  { name: 'shelf 6"', unit: "pcs", salePrice: 0, stock: 1040 },
  { name: 'shelf 8"', unit: "pcs", salePrice: 0, stock: 300 },
  { name: 'shelf 10"', unit: "pcs", salePrice: 0, stock: 200 },
  { name: 'shelf 12"', unit: "pcs", salePrice: 0, stock: 300 },
  { name: "silver", unit: "kg", salePrice: 0, stock: 0 },
];

/**
 * A handful of realistic recent entries for supplier "Bhai" (his ledger has
 * 1242 entries in Digikhata). `daysAgo` is relative to load time.
 * type: "credit" = goods bought on credit, "payment" = money paid.
 */
export const SEED_BHAI_ENTRIES: Array<{
  daysAgo: number;
  type: "credit" | "payment";
  amount: number;
  note: string;
}> = [
  { daysAgo: 18, type: "credit", amount: 84660, note: "480 shelf 6\" 62Rs / 450 shelf 8\" 90Rs / 300 shelf 4\" 48Rs" },
  { daysAgo: 18, type: "credit", amount: 54000, note: "1800 aam T+DG 30Rs" },
  { daysAgo: 16, type: "payment", amount: 100000, note: "" },
  { daysAgo: 11, type: "payment", amount: 100000, note: "" },
  { daysAgo: 11, type: "credit", amount: 69000, note: "500 shelf 4\" 48Rs / 500 shelf 8\" 90Rs" },
  { daysAgo: 4, type: "credit", amount: 29760, note: "480 shelf 6\" 62Rs" },
  { daysAgo: 4, type: "credit", amount: 226000, note: "500 shelf 4\" 48Rs / 800 shelf 6\" 62Rs / 1000 shelf 8\" 90Rs / 520 shelf 10\" 120Rs" },
  { daysAgo: 4, type: "credit", amount: 44000, note: "1000 aam loha chrome 44Rs" },
  { daysAgo: 4, type: "credit", amount: 24000, note: "500 chori 119no 20Rs / 100 china double 140Rs" },
  { daysAgo: 3, type: "credit", amount: 24000, note: "400 china chrome 60Rs" },
  { daysAgo: 3, type: "credit", amount: 54600, note: "100 shelf 4\" 48Rs / 80 shelf 6\" 62Rs / 50 shelf 8\" 90Rs / 20 shelf 12\" 172Rs" },
];

export const SEED_BHAI_NET =
  SEED_BHAI_ENTRIES.reduce(
    (s, e) => s + (e.type === "credit" ? e.amount : -e.amount),
    0,
  );
