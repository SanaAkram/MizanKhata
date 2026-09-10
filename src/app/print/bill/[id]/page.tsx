import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { isPremium } from "@/lib/auth/profile";
import { BILL_CREDIT } from "@/lib/brand";
import { serverT } from "@/lib/i18n-server";
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
  const [{ active }, t, premium] = await Promise.all([
    resolveBusiness(db),
    serverT(),
    isPremium(),
  ]);
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
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        {t("bills.notFound", "Bill not found.")}
      </main>
    );
  }

  // Non-premium bills carry the MizanKhata logo + default colour.
  const logoSrc = premium && active?.logo_url ? active.logo_url : "/icon.svg";
  const brand = (premium && active?.logo_color) || "#2f4a34";
  const muted = "#6b7266";
  const customer = sale.customer_id
    ? customers.find((c) => c.id === sale.customer_id)
    : null;
  const custName = sale.customer_name || customer?.name || null;
  const billCredit = Number(sale.credit_amount) || 0;
  const billTotal = Number(sale.total) || 0;
  const newBal = customer ? customerBalance(khataTx, customer.id) : null;
  const prevBal = newBal == null ? null : newBal - billCredit;
  // Grand total = what they owe once this whole bill is on the account.
  const grandTotal = prevBal == null ? billTotal : prevBal + billTotal;

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          style={{ height: 56, margin: "0 auto 6px", objectFit: "contain" }}
        />
        <div style={{ fontSize: 20, fontWeight: 800, color: brand }}>
          {active?.name ?? "My Shop"}
        </div>
        {active?.phone ? (
          <div style={{ fontSize: 12, color: muted }}>{active.phone}</div>
        ) : null}
        {active?.address ? (
          <div style={{ fontSize: 12, color: muted }}>{active.address}</div>
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
          <div style={{ fontWeight: 700, color: brand }}>
            {t("bills.billTo", "Bill to")}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {custName || t("bills.walkinFull", "Walk-in / cash customer")}
          </div>
          {customer?.phone ? <div>{customer.phone}</div> : null}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: brand }}>
            {t("bills.billNo", "Bill #{n}", { n: idx + 1 })}
          </div>
          <div>{new Date(sale.time).toLocaleString()}</div>
        </div>
      </div>

      <table style={{ width: "100%", fontSize: 13, marginTop: 10 }}>
        <thead>
          <tr style={{ color: muted, textAlign: "left" }}>
            <th>{t("bills.item", "Item")}</th>
            <th style={{ textAlign: "right" }}>{t("bills.qty", "Qty")}</th>
            <th style={{ textAlign: "right" }}>{t("bills.rate", "Rate")}</th>
            <th style={{ textAlign: "right" }}>{t("bills.amount", "Amount")}</th>
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
          <Row
            label={t("bills.discount", "Discount")}
            value={`− ${fmtRs(Number(sale.discount))}`}
          />
        ) : null}
        {Number(sale.tax) > 0 ? (
          <Row
            label={t("bills.tax", "Tax")}
            value={`+ ${fmtRs(Number(sale.tax))}`}
          />
        ) : null}
        <Row
          label={t("bills.total", "Total")}
          value={fmtRs(billTotal)}
          bold={prevBal == null}
          color={prevBal == null ? brand : undefined}
        />
        {prevBal != null ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                fontSize: 13,
                fontWeight: 700,
                margin: "4px 0",
                padding: "4px 8px",
                borderRadius: 6,
                border: `1px solid ${
                  prevBal > 0 ? "#c8e0cd" : prevBal < 0 ? "#e6c6c2" : "#ddd"
                }`,
                background:
                  prevBal > 0
                    ? "#eef6ef"
                    : prevBal < 0
                      ? "#fbeeec"
                      : "#f7f7f5",
                color:
                  prevBal > 0
                    ? "#2f7a43"
                    : prevBal < 0
                      ? "#b23b32"
                      : muted,
              }}
            >
              <span>{t("bills.previousAmount", "Previous amount")}</span>
              <span style={{ whiteSpace: "nowrap" }}>
                {fmtRs(Math.abs(prevBal))}
              </span>
            </div>
            <Row
              label={t("bills.grandTotalDue", "Grand total")}
              value={fmtRs(grandTotal)}
              bold
              color={brand}
            />
          </>
        ) : null}
      </div>

      {!customer ? (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 8,
            fontSize: 12,
            color: muted,
          }}
        >
          {t(
            "bills.walkinNote",
            "Cash sale — not added to anyone's account.",
          )}
        </div>
      ) : null}

      {sale.note ? (
        <p style={{ fontSize: 12, color: muted, marginTop: 10 }}>{sale.note}</p>
      ) : null}
      <p
        style={{
          fontSize: 11,
          color: muted,
          textAlign: "center",
          marginTop: 16,
        }}
      >
        {t("bills.thankYou", "Thank you.")}
      </p>
      <p
        style={{
          fontSize: 10,
          color: muted,
          textAlign: "center",
          marginTop: 6,
          letterSpacing: 0.2,
        }}
      >
        {BILL_CREDIT}
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
        gap: 12,
        fontSize: 13,
        fontWeight: bold ? 700 : 400,
        color: bold && color ? color : undefined,
        padding: "2px 0",
      }}
    >
      <span>{label}</span>
      <span style={{ whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}
