import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import {
  fetchCustomers,
  fetchKhataTx,
  fetchSupplierTx,
  fetchSuppliers,
  type Customer,
  type KhataTx,
  type Supplier,
  type SupplierTx,
} from "@/lib/khata/db";
import { fetchProducts, type Product } from "@/lib/khata/shop-db";
import PartyDetailClient from "./PartyDetailClient";

export const dynamic = "force-dynamic";

export default async function PartyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { id } = await params;
  const { kind: kindHint } = await searchParams;

  const supabase = await createClient();
  const { active } = await resolveBusiness(supabase);
  const bid = active?.id ?? "";

  let customers: Customer[] = [];
  let suppliers: Supplier[] = [];
  let khataTx: KhataTx[] = [];
  let supplierTx: SupplierTx[] = [];
  let products: Product[] = [];
  try {
    [customers, suppliers, khataTx, supplierTx, products] = await Promise.all([
      fetchCustomers(supabase, bid),
      fetchSuppliers(supabase, bid),
      fetchKhataTx(supabase, bid),
      fetchSupplierTx(supabase, bid),
      fetchProducts(supabase, bid),
    ]);
  } catch {
    /* fall through to not-found */
  }

  const customer = customers.find((c) => c.id === id);
  const supplier = suppliers.find((s) => s.id === id);
  const kind =
    kindHint === "supplier" || (!customer && supplier)
      ? "supplier"
      : "customer";
  const party = kind === "supplier" ? supplier : customer;

  if (!party) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        <p className="text-sm text-muted">Party not found.</p>
        <Link
          href="/ledger"
          className="mt-3 inline-block text-sm font-semibold text-forest underline underline-offset-4"
        >
          Back to ledger
        </Link>
      </div>
    );
  }

  return (
    <PartyDetailClient
      businessId={bid}
      kind={kind}
      party={{ id: party.id, name: party.name, phone: party.phone }}
      products={products}
      txs={
        kind === "supplier"
          ? supplierTx.filter((t) => t.supplier_id === id)
          : khataTx.filter((t) => t.customer_id === id)
      }
    />
  );
}
