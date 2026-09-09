import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { fetchSaleItems, fetchSales } from "@/lib/khata/shop-db";
import { fmtRs } from "@/lib/format";
import AutoPrint from "./AutoPrint";

export const dynamic = "force-dynamic";

export default async function BillPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await createClient();
  const { active } = await resolveBusiness(db);
  const bid = active?.id ?? "";
  const [sales, items] = await Promise.all([
    fetchSales(db, bid).catch(() => []),
    fetchSaleItems(db, bid).catch(() => []),
  ]);
  const profile = active
    ? { shop_name: active.name, phone: active.phone, address: active.address }
    : null;

  const asc = [...sales].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
  const idx = asc.findIndex((s) => s.id === id);
  const sale = idx >= 0 ? asc[idx] : null;
  const lines = items.filter((i) => i.sale_id === id);

  if (!sale) {
    return <main style={{ padding: 24, fontFamily: "system-ui" }}>Bill not found.</main>;
  }

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "0 auto",
        padding: 24,
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        color: "#23291f",
      }}
    >
      <AutoPrint />
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        {active?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.logo_url}
            alt=""
            style={{ height: 56, margin: "0 auto 6px", objectFit: "contain" }}
          />
        ) : null}
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {profile?.shop_name ?? "My Shop"}
        </div>
        {profile?.phone ? (
          <div style={{ fontSize: 12, color: "#6b7266" }}>{profile.phone}</div>
        ) : null}
        {profile?.address ? (
          <div style={{ fontSize: 12, color: "#6b7266" }}>{profile.address}</div>
        ) : null}
      </div>

      <div
        style={{
          textAlign: "center",
          fontWeight: 600,
          borderTop: "1px solid #ccc",
          borderBottom: "1px solid #ccc",
          padding: "6px 0",
        }}
      >
        Bill #{idx + 1}
        <div style={{ fontSize: 11, fontWeight: 400, color: "#6b7266" }}>
          {new Date(sale.time).toLocaleString()}
          {sale.customer_name ? ` · ${sale.customer_name}` : ""}
        </div>
      </div>

      <table style={{ width: "100%", fontSize: 13, marginTop: 10 }}>
        <thead>
          <tr style={{ color: "#6b7266", textAlign: "left" }}>
            <th>Item</th>
            <th style={{ textAlign: "right" }}>Qty</th>
            <th style={{ textAlign: "right" }}>Rate</th>
            <th style={{ textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((it) => (
            <tr key={it.id}>
              <td>{it.name}</td>
              <td style={{ textAlign: "right" }}>{Math.round(Number(it.qty))}</td>
              <td style={{ textAlign: "right" }}>{fmtRs(Number(it.price))}</td>
              <td style={{ textAlign: "right" }}>
                {fmtRs(Number(it.price) * Number(it.qty))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "1px solid #ccc", marginTop: 8, paddingTop: 8 }}>
        {Number(sale.discount) > 0 ? (
          <Row label="Discount" value={`− ${fmtRs(Number(sale.discount))}`} />
        ) : null}
        {Number(sale.tax) > 0 ? (
          <Row label="Tax" value={`+ ${fmtRs(Number(sale.tax))}`} />
        ) : null}
        <Row label="Grand total" value={fmtRs(Number(sale.total))} bold />
        {Number(sale.credit_amount) > 0 ? (
          <>
            <Row label="Paid" value={fmtRs(Number(sale.paid_cash))} />
            <Row label="Balance" value={fmtRs(Number(sale.credit_amount))} />
          </>
        ) : null}
      </div>

      {sale.note ? (
        <p style={{ fontSize: 12, color: "#6b7266", marginTop: 10 }}>
          {sale.note}
        </p>
      ) : null}
      <p style={{ fontSize: 11, color: "#6b7266", textAlign: "center", marginTop: 16 }}>
        Thank you.
      </p>
    </main>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: bold ? 700 : 400,
        padding: "2px 0",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
