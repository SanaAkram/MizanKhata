"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { newId } from "@/lib/ids";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import {
  createProduct,
  effectiveCost,
  restock,
  stockValue,
  updateProduct,
  type Product,
  type Purchase,
} from "@/lib/khata/shop-db";
import { UNITS } from "@/lib/khata/units";
import Sheet from "@/components/Sheet";

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
  products: Product[];
  purchases: Purchase[];
  suppliers: { id: string; name: string }[];
};

export default function StockClient({ products, purchases, suppliers }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [restocking, setRestocking] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);

  const totalValue = useMemo(
    () => stockValue(products, purchases),
    [products, purchases],
  );
  const recent = purchases.slice(0, 15);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/shop" className="text-sm text-muted">
        ‹ Shop
      </Link>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Stock value
          </p>
          <p className="numeric mt-1 text-lg font-semibold text-ink">
            {fmtRs(totalValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Items
          </p>
          <p className="numeric mt-1 text-lg font-semibold text-ink">
            {products.length}
          </p>
        </div>
      </section>

      <button
        onClick={() => setRestocking(true)}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper"
      >
        + Restock / add product
      </button>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          On hand
        </h2>
        {products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            No products yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {products.map((p) => {
              const cost = effectiveCost(p, purchases);
              const low = Number(p.stock) <= (Number(p.low_stock) || 5);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setEdit(p)}
                    className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">
                        {p.name}
                        {low ? (
                          <span className="ml-2 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                            Low
                          </span>
                        ) : null}
                      </span>
                      <span className="numeric text-sm font-semibold text-forest">
                        {Math.round(Number(p.stock)).toLocaleString("en-US")}{" "}
                        {p.unit}
                      </span>
                    </div>
                    <div className="mt-0.5 flex gap-3 text-[11px] text-muted">
                      <span>
                        Sale {fmtRs(Number(p.sale_price))}/{p.unit}
                      </span>
                      <span>{cost > 0 ? `Cost ${fmtRs(cost)}` : "No cost set"}</span>
                      {cost > 0 ? (
                        <span>Value {fmtRs(cost * Number(p.stock))}</span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {recent.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Recent purchases
          </h2>
          <ul className="flex flex-col gap-1.5">
            {recent.map((pu) => {
              const prod = products.find((x) => x.id === pu.product_id);
              return (
                <li
                  key={pu.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate text-ink">
                    {Math.round(Number(pu.qty))} × {prod?.name ?? "—"} @{" "}
                    {fmtRs(Number(pu.price))}
                    {pu.ref ? ` · ${pu.ref}` : ""}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {fmtEntryDate(pu.date)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <Sheet
        open={restocking}
        title="Restock"
        onClose={() => setRestocking(false)}
      >
        <RestockForm
          products={products}
          suppliers={suppliers}
          supabase={supabase}
          onDone={() => {
            setRestocking(false);
            router.refresh();
          }}
        />
      </Sheet>

      <Sheet
        open={edit !== null}
        title={edit?.name}
        onClose={() => setEdit(null)}
      >
        {edit ? (
          <EditProductForm
            product={edit}
            supabase={supabase}
            onDone={() => {
              setEdit(null);
              router.refresh();
            }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function RestockForm({
  products,
  suppliers,
  supabase,
  onDone,
}: {
  products: Product[];
  suppliers: { id: string; name: string }[];
  supabase: ReturnType<typeof createClient>;
  onDone: () => void;
}) {
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
        await createProduct(supabase, {
          id: pid,
          name: name.trim(),
          unit: unit || "pcs",
          salePrice: parseFloat(salePrice) || 0,
          purchasePrice: parseFloat(purchasePrice) || c,
          lowStock: parseFloat(lowStock) || 5,
        });
      }
      const sup = suppliers.find((s) => s.id === supplierId);
      await restock(supabase, {
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
      alert("Could not save the restock.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
      >
        <option value="__new__">+ New product</option>
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
            placeholder="Product name"
            className={inputCls}
          />
          <div className="flex gap-2">
            <UnitSelect value={unit} onChange={setUnit} className="w-1/2" />
            <input
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="Sale price"
              inputMode="decimal"
              className={`${inputCls} w-1/2`}
            />
          </div>
          <div className="flex gap-2">
            <input
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="Purchase price"
              inputMode="decimal"
              className={`${inputCls} w-1/2`}
            />
            <input
              value={lowStock}
              onChange={(e) => setLowStock(e.target.value)}
              placeholder="Low-stock alert"
              inputMode="decimal"
              className={`${inputCls} w-1/2`}
            />
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Quantity"
          inputMode="decimal"
          className="w-1/2 rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="Cost / unit"
          inputMode="decimal"
          className="w-1/2 rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
      </div>
      <input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="Bill / ref no. (optional)"
        className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
      />

      <p className="numeric text-sm text-muted">
        Batch total {fmtRs(batch)}
      </p>

      <div className="flex gap-1 rounded-xl border border-line p-1">
        {(["cash", "credit", "partial"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setPay(m)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
              pay === m ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {pay === "partial" ? (
        <input
          value={cashNow}
          onChange={(e) => setCashNow(e.target.value)}
          placeholder="Cash paid now"
          inputMode="decimal"
          className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        />
      ) : null}

      {pay !== "cash" ? (
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
        >
          <option value="">Select supplier…</option>
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
        {busy ? "Saving…" : "Save restock"}
      </button>
    </div>
  );
}

function EditProductForm({
  product,
  supabase,
  onDone,
}: {
  product: Product;
  supabase: ReturnType<typeof createClient>;
  onDone: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [unit, setUnit] = useState(product.unit || "pcs");
  const [price, setPrice] = useState(String(product.sale_price));
  const [purchase, setPurchase] = useState(String(product.purchase_price ?? 0));
  const [low, setLow] = useState(String(product.low_stock ?? 5));
  const [stock, setStock] = useState(String(product.stock));
  const [busy, setBusy] = useState(false);

  async function save() {
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
      alert("Could not update the product.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputCls}
      />
      <div className="flex gap-2">
        <UnitSelect value={unit} onChange={setUnit} className="w-1/2" />
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="Stock on hand"
          inputMode="decimal"
          className={`${inputCls} w-1/2`}
        />
      </div>
      <div className="flex gap-2">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Sale price"
          inputMode="decimal"
          className={`${inputCls} w-1/2`}
        />
        <input
          value={purchase}
          onChange={(e) => setPurchase(e.target.value)}
          placeholder="Purchase price"
          inputMode="decimal"
          className={`${inputCls} w-1/2`}
        />
      </div>
      <input
        value={low}
        onChange={(e) => setLow(e.target.value)}
        placeholder="Low-stock alert level"
        inputMode="decimal"
        className={inputCls}
      />
      <button
        onClick={save}
        disabled={busy}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
