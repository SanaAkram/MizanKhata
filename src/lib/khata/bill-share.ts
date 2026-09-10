"use client";

import { fmtRs } from "@/lib/format";
import { BILL_CREDIT } from "@/lib/brand";
import type { Sale, SaleItem } from "./shop-db";

export function billText(
  shopName: string,
  sale: Sale,
  no: number,
  items: SaleItem[],
  balances?: { prevBalance: number; newBalance: number },
): string {
  const lines = items.map(
    (i) =>
      `${Math.round(Number(i.qty))} x ${i.name} @ ${fmtRs(Number(i.price))} = ${fmtRs(Number(i.price) * Number(i.qty))}`,
  );
  const parts = [
    `${shopName} — Bill #${no}`,
    new Date(sale.time).toLocaleDateString() +
      (sale.customer_name ? ` · ${sale.customer_name}` : ""),
    "",
    ...lines,
    "",
  ];
  if (Number(sale.discount) > 0)
    parts.push(`Discount: ${fmtRs(Number(sale.discount))}`);
  if (Number(sale.tax) > 0) parts.push(`Tax: ${fmtRs(Number(sale.tax))}`);
  parts.push(`Total: ${fmtRs(Number(sale.total))}`);
  if (Number(sale.credit_amount) > 0)
    parts.push(
      `Paid: ${fmtRs(Number(sale.paid_cash))} · This bill on credit: ${fmtRs(Number(sale.credit_amount))}`,
    );
  if (balances) {
    parts.push("");
    parts.push(`Previous balance: ${fmtRs(balances.prevBalance)}`);
    parts.push(`Total balance now: ${fmtRs(balances.newBalance)}`);
  }
  parts.push("");
  parts.push(BILL_CREDIT);
  return parts.join("\n");
}

export async function shareBill(text: string, phone?: string): Promise<void> {
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ title: "Bill", text });
      return;
    } catch {
      /* cancelled — fall through to WhatsApp */
    }
  }
  const wa =
    "https://wa.me/" +
    (phone ? phone.replace(/[^0-9]/g, "") : "") +
    "?text=" +
    encodeURIComponent(text);
  window.open(wa, "_blank");
}

export function speakBill(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    alert("Text-to-speech isn't available on this device.");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}
