"use client";

import { toast } from "@/lib/toast";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { newId } from "@/lib/ids";
import { fmtRs } from "@/lib/format";
import {
  createProduct,
  effectiveCost,
  restock,
  stockValue,
  type Product,
  type Purchase,
  type StockMove,
} from "@/lib/khata/shop-db";
import { UNITS } from "@/lib/khata/units";
import { useT } from "@/lib/i18n";
import Sheet from "@/components/Sheet";
import CalcField from "@/components/CalcField";

const inputCls =
  "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";

function UnitSelect({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} ${className}`}
    >
      {UNITS.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
      {!(UNITS as readonly string[]).includes(value) && value ? (
        <option value={value}>{value}</option>
      ) : null}
    </select>
  );
}

type Props = {
  businessId: string;
  products: Product[];
  purchases: Purchase[];
  moves: StockMove[];
  suppliers: { id: string; name: string }[];
};

export default function StockClient({
  businessId,
  products,
  purchases,
  moves,
  suppliers,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();
  const [tab, setTab] = useState<"all" | "low">("all");
  const [q, setQ] = useState("");
  const [restocking, setRestocking] = useState(false);

  const totalValue = useMemo(
    () => stockValue(products, purchases),
    [products, purchases],
  );

  const lastMove = useMemo(() => {
    const m = new Map<string, string>();
    for (const mv of moves) {
      if (!m.has(mv.product_id)) m.set(mv.product_id, mv.date);
    }
    for (const p of purchases) {
      if (p.product_id && !m.has(p.product_id)) m.set(p.product_id, p.date);
    }
    return m;
  }, [moves, purchases]);

  const shown = products
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .filter((p) =>
      tab === "low" ? Number(p.stock) <= (Number(p.low_stock) || 5) : true,
    );

  return (
    <div className="flex flex-col gap-4">
      <Link href="/shop" className="text-sm text-muted">
        ‹ {t("nav.shop", "Shop")}
      </Link>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("stock.totalValue", "Stock value")}
          </p>
          <p className="numeric mt-1 text-lg font-semibold text-ink">
            {fmtRs(totalValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("stock.items", "Items")}
          </p>
          <p className="numeric mt-1 text-lg font-semibold text-ink">
            {products.length}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/shop/stock/reports?type=in"
          className="rounded-xl border border-ok/40 bg-ok/10 px-4 py-2.5 text-center text-sm font-semibold text-ok"
        >
          {t("stock.inReportBtn", "Stock IN report")}
        </Link>
        <Link
          href="/shop/stock/reports?type=out"
          className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-center text-sm font-semibold text-danger"
        >
          {t("stock.outReportBtn", "Stock OUT report")}
        </Link>
      </div>

      <button
        onClick={() => setRestocking(true)}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper"
      >
        {t("stock.restockAdd", "+ Restock / add product")}
      </button>

      <div className="flex gap-1 rounded-xl border border-line bg-card p-1">
        {(["all", "low"] as const).map((tk) => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              tab === tk ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {tk === "all"
              ? t("stock.allItems", "All items")
              : t("stock.lowStock", "Low stock")}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("stock.searchItems", "Search {n} items", {
          n: products.length,
        })}
        className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-forest"
      />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {tab === "low"
            ? t("stock.nothingLow", "Nothing low on stock.")
            : t("stock.noProducts", "No products.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((p) => {
            const cost = effectiveCost(p, purchases);
            const low = Number(p.stock) <= (Number(p.low_stock) || 5);
            const last = lastMove.get(p.id);
            return (
              <li key={p.id}>
                <Link
                  href={`/shop/stock/${p.id}`}
                  className="block rounded-xl border border-line bg-card px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">
                      {p.name}
                      {low ? (
                        <span className="ml-2 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                          {t("stock.low", "Low")}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`numeric text-sm font-semibold ${
                        low ? "text-danger" : "text-forest"
                      }`}
                    >
                      {Math.round(Number(p.stock)).toLocaleString("en-US")}{" "}
                      {p.unit}
                    </span>
                  </div>
                  <div className="mt-0.5 flex gap-3 text-[11px] text-muted">
                    <span>
                      {t("stock.sale", "Sale")} {fmtRs(Number(p.sale_price))}
                    </span>
                    <span>
                      {cost > 0
                        ? t("stock.cost", "Cost {v}", { v: fmtRs(cost) })
                        : t("stock.noCost", "no cost")}
                    </span>
                    {last ? (
                      <span>
                        {new Date(last).toLocaleDateString([], {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={restocking}
        title={t("stock.restock", "Restock")}
        onClose={() => setRestocking(false)}
      >
        <RestockForm
          businessId={businessId}
          products={products}
          suppliers={suppliers}
          supabase={supabase}
          onDone={() => {
            setRestocking(false);
            router.refresh();
          }}
        />
      </Sheet>
    </div>
  );
}

function RestockForm({
  businessId,
  products,
  suppliers,
  supabase,
  onDone,
}: {
  businessId: string;
  products: Product[];
  suppliers: { id: string; name: string }[];
  supabase: ReturnType<typeof createClient>;
  onDone: () => void;
}) {
  const t = useT();
  const [productId, setProductId] = useState(products[0]?.id ?? "__new__");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [salePrice, setSalePrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [lowStock, setLowStock] = useState("5");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [ref, setRef] = useState("");
  const [pay, setPay] = useState<"cash" | "credit" | "partial">("cash");
  const [supplierId, setSupplierId] = useState("");
  const [cashNow, setCashNow] = useState("");
  const [busy, setBusy] = useState(false);

  const isNew = productId === "__new__";
  const q = parseFloat(qty) || 0;
  const c = parseFloat(cost) || 0;
  const batch = Math.round(q * c * 100) / 100;
  const cashPaid =
    pay === "cash"
      ? batch
      : pay === "credit"
        ? 0
        : Math.min(Math.max(parseFloat(cashNow) || 0, 0), batch);
  const canSubmit =
    q > 0 &&
    c >= 0 &&
    (!isNew || name.trim()) &&
    (pay === "cash" || supplierId) &&
    !busy;

  async function save() {
    setBusy(true);
    try {
      let pid = productId;
      if (isNew) {
        pid = newId("p_");
        await createProduct(supabase, businessId, {
          id: pid,
          name: name.trim(),
          unit: unit || "pcs",
          salePrice: parseFloat(salePrice) || 0,
          purchasePrice: parseFloat(purchasePrice) || c,
          lowStock: parseFloat(lowStock) || 5,
        });
      }
      const sup = suppliers.find((s) => s.id === supplierId);
      await restock(supabase, businessId, {
        productId: pid,
        qty: q,
        price: c,
        ref: ref.trim() || null,
        supplierId: pay === "cash" ? null : supplierId,
        supplierName: sup?.name ?? null,
        cashPaid,
      });
      onDone();
    } catch {
      toast("Could not save the restock.", "error");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        className={inputCls}
      >
        <option value="__new__">{t("stock.newProduct", "+ New product")}</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {isNew ? (
        <div className="flex flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("stock.productName", "Product name")}
            className={inputCls}
          />
          <div className="flex gap-2">
            <UnitSelect value={unit} onChange={setUnit} className="w-1/2" />
            <input
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder={t("stock.salePrice", "Sale price")}
              inputMode="decimal"
              className={`${inputCls} w-1/2`}
            />
          </div>
          <div className="flex gap-2">
            <input
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder={t("stock.purchasePrice", "Purchase price")}
              inputMode="decimal"
              className={`${inputCls} w-1/2`}
            />
            <input
              value={lowStock}
              onChange={(e) => setLowStock(e.target.value)}
              placeholder={t("stock.lowStockAlert", "Low-stock alert")}
              inputMode="decimal"
              className={`${inputCls} w-1/2`}
            />
          </div>
        </div>
      ) : null}

      <label className="text-xs font-semibold text-muted">
        {t("stock.qty", "Quantity")}
        <CalcField
          value={qty}
          onChange={setQty}
          placeholder={t("stock.qty", "Quantity")}
        />
      </label>
      <label className="text-xs font-semibold text-muted">
        {t("stock.costPerUnit", "Cost / unit")}
        <CalcField
          value={cost}
          onChange={setCost}
          placeholder={t("stock.costPerUnit", "Cost / unit")}
        />
      </label>
      <input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder={t("stock.billRefOpt", "Bill / ref no. (optional)")}
        className={inputCls}
      />

      <p className="numeric text-sm text-muted">
        {t("stock.batchTotal", "Batch total {v}", { v: fmtRs(batch) })}
      </p>

      <div className="flex gap-1 rounded-xl border border-line p-1">
        {(["cash", "credit", "partial"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setPay(m)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              pay === m ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {t(`pos.mode.${m}`, m)}
          </button>
        ))}
      </div>

      {pay === "partial" ? (
        <input
          value={cashNow}
          onChange={(e) => setCashNow(e.target.value)}
          placeholder={t("stock.cashPaidNow", "Cash paid now")}
          inputMode="decimal"
          className={inputCls}
        />
      ) : null}

      {pay !== "cash" ? (
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className={inputCls}
        >
          <option value="">
            {t("stock.selectSupplier", "Select supplier…")}
          </option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : null}

      <button
        onClick={save}
        disabled={!canSubmit}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? t("c.saving", "Saving…") : t("stock.saveRestock", "Save restock")}
      </button>
    </div>
  );
}
