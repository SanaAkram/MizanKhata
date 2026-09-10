import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import { isPremium } from "@/lib/auth/profile";
import { BILL_CREDIT } from "@/lib/brand";
import { serverT } from "@/lib/i18n-server";
import {
  fetchSuppliers,
  fetchSupplierTx,
  supplierBalance,
} from "@/lib/khata/db";
import { fetchProducts, fetchPurchases } from "@/lib/khata/shop-db";
import { fmtRs } from "@/lib/format";
import AutoPrint from "../../bill/[id]/AutoPrint";

export const dynamic = "force-dynamic";

export default async function PurchasePrintPage({
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
  const [txs, suppliers, purchases, products] = await Promise.all([
    fetchSupplierTx(db, bid).catch(() => []),
    fetchSuppliers(db, bid).catch(() => []),
    fetchPurchases(db, bid).catch(() => []),
    fetchProducts(db, bid).catch(() => []),
  ]);

  const tx = txs.find((x) => x.id === id) ?? null;
  if (!tx) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        {t("bills.notFound", "Not found.")}
      </main>
    );
  }

  const supplier = suppliers.find((s) => s.id === tx.supplier_id) ?? null;
  const pname = (pid: string | null) =>
    products.find((p) => p.id === pid) ?? { name: "—", unit: "" };
  const lines = purchases.filter((p) => p.ref === id);

  const logoSrc = premium && active?.logo_url ? active.logo_url : "/icon.svg";
  const brand = (premium && active?.logo_color) || "#2f4a34";
  const muted = "#6b7266";

  const total =
    lines.length > 0
      ? lines.reduce((s, l) => s + Number(l.qty) * Number(l.price), 0)
      : Number(tx.amount) || 0;
  // supplierBalance is +ve when we owe the supplier. This purchase is on
  // credit, so it's already included in the current balance.
  const newBal = supplier ? supplierBalance(txs, supplier.id) : null;
  const prevBal = newBal == null ? null : newBal - (Number(tx.amount) || 0);

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
            {t("prt.purchaseFrom", "Purchase from")}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {supplier?.name ?? t("c.supplier", "Supplier")}
          </div>
          {supplier?.phone ? <div>{supplier.phone}</div> : null}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: brand }}>
            {t("prt.purchaseNote", "On credit")}
          </div>
          <div>{new Date(tx.date).toLocaleString()}</div>
        </div>
      </div>

      {lines.length > 0 ? (
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
            {lines.map((l) => (
              <tr key={l.id}>
                <td>{pname(l.product_id).name}</td>
                <td style={{ textAlign: "right" }}>
                  {Math.round(Number(l.qty))}
                </td>
                <td style={{ textAlign: "right" }}>{fmtRs(Number(l.price))}</td>
                <td style={{ textAlign: "right" }}>
                  {fmtRs(Number(l.price) * Number(l.qty))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : tx.note ? (
        <p style={{ whiteSpace: "pre-line", fontSize: 13, marginTop: 10 }}>
          {tx.note}
        </p>
      ) : null}

      <div style={{ borderTop: "1px solid #ddd", marginTop: 8, paddingTop: 8 }}>
        <Row
          label={t("bills.total", "Total")}
          value={fmtRs(total)}
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
                border: `1px solid ${prevBal > 0 ? "#e6c6c2" : "#ddd"}`,
                background: prevBal > 0 ? "#fbeeec" : "#f7f7f5",
                color: prevBal > 0 ? "#b23b32" : muted,
              }}
            >
              <span>{t("bills.previousAmount", "Previous amount")}</span>
              <span style={{ whiteSpace: "nowrap" }}>
                {fmtRs(Math.abs(prevBal))}
              </span>
            </div>
            <Row
              label={t("prt.toPayNow", "To pay {name}", {
                name: supplier?.name ?? "",
              })}
              value={fmtRs(prevBal + total)}
              bold
              color={brand}
            />
          </>
        ) : null}
      </div>

      <p
        style={{
          fontSize: 11,
          color: muted,
          textAlign: "center",
          marginTop: 16,
        }}
      >
        {t("prt.purchaseThanks", "Goods received.")}
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
