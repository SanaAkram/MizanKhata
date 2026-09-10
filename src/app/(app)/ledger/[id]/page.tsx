import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import type { KhataTx, SupplierTx } from "@/lib/khata/db";
import { fetchProducts, type Product } from "@/lib/khata/shop-db";
import { serverT } from "@/lib/i18n-server";
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

  // Look the party up on the hinted side first, then the other.
  const wantSupplier = kindHint === "supplier";
  const custQ = supabase
    .from("shop_customers")
    .select("id,name,phone")
    .eq("business_id", bid)
    .eq("id", id)
    .maybeSingle();
  const suppQ = supabase
    .from("shop_suppliers")
    .select("id,name,phone")
    .eq("business_id", bid)
    .eq("id", id)
    .maybeSingle();

  const [{ data: customer }, { data: supplier }, products] = await Promise.all([
    custQ,
    suppQ,
    fetchProducts(supabase, bid).catch(() => [] as Product[]),
  ]);

  const kind: "customer" | "supplier" =
    wantSupplier || (!customer && supplier) ? "supplier" : "customer";
  const party = kind === "supplier" ? supplier : customer;

  if (!party) {
    const t = await serverT();
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        <p className="text-sm text-muted">
          {t("party.notFound", "Party not found.")}
        </p>
        <Link
          href="/ledger"
          className="mt-3 inline-block text-sm font-semibold text-forest underline underline-offset-4"
        >
          {t("party.backToLedger", "Back to ledger")}
        </Link>
      </div>
    );
  }

  // Only this party's transactions — not the whole ledger.
  let txs: KhataTx[] | SupplierTx[] = [];
  if (kind === "supplier") {
    const { data } = await supabase
      .from("shop_supplier_tx")
      .select("*")
      .eq("business_id", bid)
      .eq("supplier_id", id)
      .order("date", { ascending: true });
    txs = data ?? [];
  } else {
    const { data } = await supabase
      .from("shop_khata_tx")
      .select("*")
      .eq("business_id", bid)
      .eq("customer_id", id)
      .order("date", { ascending: true });
    txs = data ?? [];
  }

  return (
    <PartyDetailClient
      businessId={bid}
      kind={kind}
      party={{ id: party.id, name: party.name, phone: party.phone }}
      products={products}
      txs={txs}
    />
  );
}
