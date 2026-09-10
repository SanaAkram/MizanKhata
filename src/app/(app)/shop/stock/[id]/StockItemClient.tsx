"use client";

import { toast } from "@/lib/toast";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { newId } from "@/lib/ids";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import {
  addStockMove,
  deleteStockMove,
  stockHistory,
  updateProduct,
  type Product,
  type Purchase,
  type StockMove,
  type StockRow,
} from "@/lib/khata/shop-db";
import { UNITS } from "@/lib/khata/units";
import { useT } from "@/lib/i18n";
import Sheet from "@/components/Sheet";
import CalcField from "@/components/CalcField";
import ItemLinePicker, {
  linesToText,
  linesTotal,
  type ItemLine,
} from "@/components/ItemLinePicker";

const inputCls =
  "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";

type Props = {
  businessId: string;
  product: Product;
  products: Product[];
  purchases: Purchase[];
  moves: StockMove[];
  suppliers: { id: string; name: string }[];
};

export default function StockItemClient({
  businessId,
  product,
  products,
  purchases,
  moves,
  suppliers,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();

  const [addKind, setAddKind] = useState<"in" | "out" | null>(null);
  const [detail, setDetail] = useState<StockRow | null>(null);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [armDel, setArmDel] = useState(false);

  const rows = useMemo(
    () => stockHistory(product.id, purchases, moves),
    [product.id, purchases, moves],
  );
  const totalIn = rows
    .filter((r) => r.kind === "in")
    .reduce((s, r) => s + r.qty, 0);
  const totalOut = rows
    .filter((r) => r.kind === "out")
    .reduce((s, r) => s + r.qty, 0);

  const supName = (id: string | null) =>
    suppliers.find((s) => s.id === id)?.name ?? null;

  async function saveMove(
    kind: "in" | "out",
    qty: number,
    rate: number | null,
    note: string,
    supplierId: string | null,
    dateIso: string,
  ) {
    await addStockMove(supabase, businessId, {
      id: newId("sm_"),
      productId: product.id,
      kind,
      qty,
      rate,
      note: note || null,
      supplierId: supplierId || null,
      date: dateIso,
    });
    setAddKind(null);
    router.refresh();
  }

  async function removeRow(r: StockRow) {
    if (r.source === "move") {
      await deleteStockMove(supabase, {
        id: r.id,
        product_id: product.id,
        kind: r.kind,
        qty: r.qty,
      });
    } else {
      // purchase row — delete the purchase + reverse stock
      await supabase.from("shop_purchases").delete().eq("id", r.id);
      const nextStock = Math.max(
        0,
        Math.round((Number(product.stock) - r.qty) * 100) / 100,
      );
      await updateProduct(supabase, product.id, { stock: nextStock });
    }
    setDetail(null);
    router.refresh();
  }

  async function removeProduct() {
    await supabase.from("shop_stock_moves").delete().eq("product_id", product.id);
    await supabase.from("shop_purchases").delete().eq("product_id", product.id);
    await supabase.from("shop_products").delete().eq("id", product.id);
    router.push("/shop/stock");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between">
        <Link href="/shop/stock" className="text-sm text-muted">
          ‹ {t("nav.shop", "Stock")}
        </Link>
        <button
          onClick={() => setMenu(true)}
          aria-label="More"
          className="rounded-lg px-2 py-1 text-lg leading-none text-muted"
        >
          ⋮
        </button>
      </div>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h1 className="numeric text-xl font-semibold text-ink">
          {product.name}
        </h1>
        <p className="numeric mt-1 text-sm font-semibold text-forest">
          {t("stock.inHandOf", "{n} {unit} in hand", {
            n: Math.round(Number(product.stock)).toLocaleString("en-US"),
            unit: product.unit,
          })}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted">
              {t("stock.totalIn", "Total in")}
            </p>
            <p className="numeric text-sm font-semibold text-ok">
              {Math.round(totalIn).toLocaleString("en-US")}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted">
              {t("stock.totalOut", "Total out")}
            </p>
            <p className="numeric text-sm font-semibold text-danger">
              {Math.round(totalOut).toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {t("stock.noMoves", "No stock movements yet.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setDetail(r)}
                className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="whitespace-pre-line text-xs text-ink">
                      {r.note ||
                        (r.source === "purchase"
                          ? t("stock.purchase", "Purchase")
                          : t("stock.adjustment", "Adjustment"))}
                      {r.rate != null ? ` · ${fmtRs(r.rate)}/${product.unit}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {fmtEntryDate(r.date)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`numeric text-sm font-semibold ${
                        r.kind === "in" ? "text-ok" : "text-danger"
                      }`}
                    >
                      {r.kind === "in" ? "+" : "−"}
                      {Math.round(r.qty).toLocaleString("en-US")}
                    </p>
                    <p className="numeric text-[11px] text-muted">
                      {Math.round(r.running).toLocaleString("en-US")}{" "}
                      {product.unit}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* IN / OUT buttons */}
      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto flex max-w-[480px] gap-2 border-t border-line bg-paper/98 px-5 py-3 backdrop-blur">
        <button
          onClick={() => setAddKind("in")}
          className="flex-1 rounded-xl bg-ok px-4 py-3 text-sm font-semibold text-paper"
        >
          {t("stock.inBuyBtn", "IN / Buy")}
        </button>
        <button
          onClick={() => setAddKind("out")}
          className="flex-1 rounded-xl bg-danger px-4 py-3 text-sm font-semibold text-paper"
        >
          {t("stock.outSellBtn", "OUT / Sell")}
        </button>
      </div>

      <Sheet
        open={addKind !== null}
        title={
          addKind === "in"
            ? t("stock.stockIn", "Stock IN")
            : t("stock.stockOut", "Stock OUT")
        }
        onClose={() => setAddKind(null)}
      >
        {addKind ? (
          <MoveForm
            kind={addKind}
            unit={product.unit}
            defaultRate={
              addKind === "in"
                ? Number(product.purchase_price) || 0
                : Number(product.sale_price) || 0
            }
            products={products}
            suppliers={suppliers}
            onSubmit={(qty, rate, note, sup, iso) =>
              saveMove(addKind, qty, rate, note, sup, iso)
            }
          />
        ) : null}
      </Sheet>

      <Sheet
        open={detail !== null}
        title={
          detail?.kind === "in"
            ? t("stock.stockIn", "Stock IN")
            : t("stock.stockOut", "Stock OUT")
        }
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <div className="flex flex-col gap-3">
            <p
              className={`numeric text-2xl font-semibold ${
                detail.kind === "in" ? "text-ok" : "text-danger"
              }`}
            >
              {detail.kind === "in" ? "+" : "−"}
              {Math.round(detail.qty)} {product.unit}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted">{t("stock.rate", "Rate")}</span>
              <span className="numeric text-right">
                {detail.rate != null ? fmtRs(detail.rate) : "—"}
              </span>
              <span className="text-muted">{t("bills.amount", "Amount")}</span>
              <span className="numeric text-right">
                {detail.rate != null
                  ? fmtRs(detail.rate * detail.qty)
                  : "—"}
              </span>
              <span className="text-muted">{t("stock.date", "Date")}</span>
              <span className="text-right">{fmtEntryDate(detail.date)}</span>
            </div>
            {detail.note ? (
              <p className="whitespace-pre-line rounded-lg border border-line bg-paper p-3 text-sm">
                {detail.note}
              </p>
            ) : null}
            {detail.supplierId ? (
              <Link
                href={`/ledger/${detail.supplierId}?kind=supplier`}
                className="text-sm font-semibold text-forest underline underline-offset-4"
              >
                {t("stock.ledgerLink", "{name} — ledger ›", {
                  name: supName(detail.supplierId) ?? t("c.supplier", "Supplier"),
                })}
              </Link>
            ) : null}
            <button
              onClick={() => void removeRow(detail)}
              className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger"
            >
              {t("stock.deleteEntry", "Delete entry")}
            </button>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={menu} title={product.name} onClose={() => setMenu(false)}>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              setMenu(false);
              setEditing(true);
            }}
            className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper"
          >
            {t("stock.editProduct", "Edit product")}
          </button>
          <button
            onClick={() => {
              if (!armDel) {
                setArmDel(true);
                setTimeout(() => setArmDel(false), 3000);
                return;
              }
              void removeProduct();
            }}
            className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger"
          >
            {armDel
              ? t("stock.deleteProductArm", "Tap again to delete product")
              : t("stock.deleteProduct", "Delete product")}
          </button>
        </div>
      </Sheet>

      <Sheet
        open={editing}
        title={t("stock.editTitle", "Edit {name}", { name: product.name })}
        onClose={() => setEditing(false)}
      >
        <EditProduct
          product={product}
          supabase={supabase}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </Sheet>
    </div>
  );
}

function MoveForm({
  kind,
  unit,
  defaultRate,
  products,
  suppliers,
  onSubmit,
}: {
  kind: "in" | "out";
  unit: string;
  defaultRate: number;
  products: Product[];
  suppliers: { id: string; name: string }[];
  onSubmit: (
    qty: number,
    rate: number | null,
    note: string,
    supplierId: string | null,
    dateIso: string,
  ) => void;
}) {
  const t = useT();
  const now = new Date();
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState(defaultRate ? String(defaultRate) : "");
  const [note, setNote] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`,
  );
  const [time, setTime] = useState(
    `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`,
  );
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const q = parseFloat(qty) || 0;
  const r = rate === "" ? null : parseFloat(rate) || 0;

  function addLines(lines: ItemLine[]) {
    if (!lines.length) return;
    setNote((n) => (n ? n + "\n" : "") + linesToText(lines));
    const totalQty = lines.reduce((s, l) => s + l.qty, 0);
    setQty(String((q || 0) + totalQty));
    setRate(String(Math.round((linesTotal(lines) / (totalQty || 1)) * 100) / 100));
    setPicker(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-semibold text-muted">
        {t("stock.qtyUnit", "Quantity ({unit})", { unit })}
        <CalcField
          autoFocus
          value={qty}
          onChange={setQty}
          placeholder={t("stock.qtyUnit", "Quantity ({unit})", { unit })}
        />
      </label>
      <label className="text-xs font-semibold text-muted">
        {kind === "in"
          ? t("stock.purchaseRate", "Purchase rate")
          : t("stock.saleRate", "Sale rate")}
        <CalcField
          value={rate}
          onChange={setRate}
          placeholder={
            kind === "in"
              ? t("stock.purchaseRate", "Purchase rate")
              : t("stock.saleRate", "Sale rate")
          }
        />
      </label>
      <button
        onClick={() => setPicker(true)}
        className="rounded-lg border border-line px-3 py-2.5 text-left text-sm font-semibold text-forest"
      >
        {t("stock.addItems", "+ Add items from stock")}
      </button>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("c.notePh", "Details / comments")}
        rows={3}
        className={`${inputCls} resize-none`}
      />
      {kind === "in" ? (
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className={inputCls}
        >
          <option value="">{t("stock.supplierOpt", "Supplier (optional)")}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : null}
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${inputCls} w-1/2`}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={`${inputCls} w-1/2`}
        />
      </div>
      {r != null && q > 0 ? (
        <p className="numeric text-sm text-muted">
          {t("stock.amountOf", "Amount {v}", { v: fmtRs(r * q) })}
        </p>
      ) : null}
      <button
        onClick={() => {
          if (q <= 0 || busy) return;
          setBusy(true);
          onSubmit(
            q,
            r,
            note.trim(),
            supplierId || null,
            new Date(`${date}T${time || "12:00"}:00`).toISOString(),
          );
        }}
        disabled={q <= 0 || busy}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? t("c.saving", "Saving…") : t("c.save", "Save")}
      </button>
      <ItemLinePicker
        open={picker}
        products={products}
        rateFrom={kind === "in" ? "purchase" : "sale"}
        onClose={() => setPicker(false)}
        onDone={addLines}
      />
    </div>
  );
}

function EditProduct({
  product,
  supabase,
  onDone,
}: {
  product: Product;
  supabase: ReturnType<typeof createClient>;
  onDone: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(product.name);
  const [unit, setUnit] = useState(product.unit || "pcs");
  const [price, setPrice] = useState(String(product.sale_price));
  const [purchase, setPurchase] = useState(String(product.purchase_price ?? 0));
  const [low, setLow] = useState(String(product.low_stock ?? 5));
  const [stock, setStock] = useState(String(product.stock));
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputCls}
      />
      <div className="flex gap-2">
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={`${inputCls} w-1/2`}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder={t("stock.stockOnHand", "Stock on hand")}
          inputMode="decimal"
          className={`${inputCls} w-1/2`}
        />
      </div>
      <div className="flex gap-2">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t("stock.salePrice", "Sale price")}
          inputMode="decimal"
          className={`${inputCls} w-1/2`}
        />
        <input
          value={purchase}
          onChange={(e) => setPurchase(e.target.value)}
          placeholder={t("stock.purchasePrice", "Purchase price")}
          inputMode="decimal"
          className={`${inputCls} w-1/2`}
        />
      </div>
      <input
        value={low}
        onChange={(e) => setLow(e.target.value)}
        placeholder={t("stock.lowAlertLevel", "Low-stock alert level")}
        inputMode="decimal"
        className={inputCls}
      />
      <button
        onClick={async () => {
          setBusy(true);
          try {
            await updateProduct(supabase, product.id, {
              name: name.trim() || product.name,
              unit: unit || "pcs",
              sale_price: parseFloat(price) || 0,
              purchase_price: parseFloat(purchase) || 0,
              low_stock: parseFloat(low) || 5,
              stock: parseFloat(stock) || 0,
            });
            onDone();
          } catch {
            toast("Could not update.", "error");
            setBusy(false);
          }
        }}
        disabled={busy}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? t("c.saving", "Saving…") : t("c.save", "Save")}
      </button>
    </div>
  );
}
