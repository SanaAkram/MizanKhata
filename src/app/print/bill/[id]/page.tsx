import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import {
  customerBalance,
  fetchCustomers,
  fetchKhataTx,
} from "@/lib/khata/db";
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
  const [sales, items, customers, khataTx] = await Promise.all([
    fetchSales(db, bid).catch(() => []),
    fetchSaleItems(db, bid).catch(() => []),
    fetchCustomers(db, bid).catch(() => []),
    fetchKhataTx(db, bid).catch(() => []),
  ]);

  const asc = [...sales].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
  const idx = asc.findIndex((s) => s.id === id);
  const sale = idx >= 0 ? asc[idx] : null;
  const lines = items.filter((i) => i.sale_id === id);

  if (!sale) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>Bill not found.</main>
    );
  }

  const brand = active?.logo_color || "#2f4a34";
  const customer = sale.customer_id
    ? customers.find((c) => c.id === sale.customer_id)
    : null;
  const newBal = customer ? customerBalance(khataTx, customer.id) : 0;
  const prevBal = newBal - Number(sale.credit_amount || 0);

  return (
    <main
      style={{
        maxWidth: 440,
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
            style={{ height: 64, margin: "0 auto 6px", objectFit: "contain" }}
          />
        ) : null}
        <div style={{ fontSize: 20, fontWeight: 800, color: brand }}>
          {active?.name ?? "My Shop"}
        </div>
        {active?.phone ? (
          <div style={{ fontSize: 12, color: "#6b7266" }}>{active.phone}</div>
        ) : null}
        {active?.address ? (
          <div style={{ fontSize: 12, color: "#6b7266" }}>{active.address}</div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          borderTop: `2px solid ${brand}`,
          borderBottom: "1px solid #ddd",
          padding: "8px 0",
          fontSize: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: brand }}>Bill To</div>
          <div>{sale.customer_name || "Walk-in customer"}</div>
          {customer?.phone ? <div>{customer.phone}</div> : null}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: brand }}>
            Bill #{idx + 1}
          </div>
          <div>{new Date(sale.time).toLocaleString()}</div>
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

      <div style={{ borderTop: "1px solid #ddd", marginTop: 8, paddingTop: 8 }}>
        {Number(sale.discount) > 0 ? (
          <Row label="Discount" value={`− ${fmtRs(Number(sale.discount))}`} />
        ) : null}
        {Number(sale.tax) > 0 ? (
          <Row label="Tax" value={`+ ${fmtRs(Number(sale.tax))}`} />
        ) : null}
        <Row
          label="Grand total"
          value={fmtRs(Number(sale.total))}
          bold
          color={brand}
        />
        {Number(sale.credit_amount) > 0 ? (
          <>
            <Row label="Paid" value={fmtRs(Number(sale.paid_cash))} />
            <Row label="This bill (credit)" value={fmtRs(Number(sale.credit_amount))} />
          </>
        ) : null}
      </div>

      {customer ? (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            border: `1px solid ${brand}33`,
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          <Row label={`Previous balance`} value={fmtRs(prevBal)} />
          <Row
            label={`New balance`}
            value={fmtRs(newBal)}
            bold
            color={brand}
          />
        </div>
      ) : null}

      {sale.note ? (
        <p style={{ fontSize: 12, color: "#6b7266", marginTop: 10 }}>
          {sale.note}
        </p>
      ) : null}
      <p
        style={{
          fontSize: 11,
          color: "#6b7266",
          textAlign: "center",
          marginTop: 16,
        }}
      >
        Thank you.
      </p>
    </main>
  );
}

function Row({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: bold ? 700 : 400,
        color: bold && color ? color : undefined,
        padding: "2px 0",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
