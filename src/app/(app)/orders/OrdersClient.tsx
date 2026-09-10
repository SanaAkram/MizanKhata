"use client";

import { toast } from "@/lib/toast";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { newId } from "@/lib/ids";
import { fmtRs } from "@/lib/format";
import { useT } from "@/lib/i18n";
import {
  addOrder,
  daysUntil,
  deleteOrder,
  orderBucket,
  setOrderStatus,
  updateOrder,
  type Order,
  type OrderBucket,
  type OrderDirection,
} from "@/lib/khata/orders";
import type { Product } from "@/lib/khata/shop-db";
import { receiptImage, shareImage } from "@/lib/khata/receipt-image";
import Sheet from "@/components/Sheet";
import ItemLinePicker, {
  linesToText,
  linesTotal,
  type ItemLine,
} from "@/components/ItemLinePicker";

export type PartyOpt = {
  id: string;
  name: string;
  kind: "customer" | "supplier";
};

const BUCKET_ORDER: OrderBucket[] = [
  "overdue",
  "today",
  "soon",
  "later",
  "nodate",
];

export default function OrdersClient({
  businessId,
  businessName,
  orders,
  parties,
  products,
}: {
  businessId: string;
  businessName: string;
  orders: Order[];
  parties: PartyOpt[];
  products: Product[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();
  const [tab, setTab] = useState<"open" | "done">("open");
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);

  const open = useMemo(
    () => orders.filter((o) => o.status === "open"),
    [orders],
  );
  const done = useMemo(
    () => orders.filter((o) => o.status !== "open"),
    [orders],
  );
  const dueCount = open.filter((o) => {
    const b = orderBucket(o);
    return b === "overdue" || b === "today" || b === "soon";
  }).length;

  const grouped = useMemo(() => {
    const m = new Map<OrderBucket, Order[]>();
    for (const o of open) {
      const b = orderBucket(o);
      const arr = m.get(b) ?? [];
      arr.push(o);
      m.set(b, arr);
    }
    return m;
  }, [open]);

  async function mark(o: Order, status: "done" | "cancelled" | "open") {
    setBusy(true);
    try {
      await setOrderStatus(supabase, o.id, status);
      setDetail(null);
      router.refresh();
    } catch {
      toast("Could not update the order.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function shareAsPhoto(o: Order) {
    setImgBusy(true);
    try {
      // details = "qty name" lines, optionally "\n\n<note>"
      const [itemsBlock, ...rest] = (o.details ?? "").split("\n\n");
      const rows = (itemsBlock || o.title)
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((left) => ({ left }));
      const blob = await receiptImage({
        shopName: businessName || "MizanKhata",
        heading: t("ord.orderSlip", "ORDER"),
        // No party name — this list is sent to a supplier; the customer is private.
        dateText: o.due_date
          ? `${t("ord.due", "Due")} ${o.due_date}`
          : undefined,
        rows,
        note: rest.join("\n\n") || null,
      });
      await shareImage(
        blob,
        `order-${(o.title || "list").replace(/[^a-z0-9]+/gi, "-").slice(0, 24)}.png`,
        t("ord.orderSlip", "ORDER"),
      );
    } catch {
      toast("Could not make the image.", "error");
    } finally {
      setImgBusy(false);
    }
  }

  async function remove(o: Order) {
    setBusy(true);
    try {
      await deleteOrder(supabase, o.id);
      setDetail(null);
      router.refresh();
    } catch {
      toast("Could not delete the order.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/shop" className="text-sm text-muted">
          ‹ {t("nav.shop", "Shop")}
        </Link>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("ord.openOrders", "Open orders")}
        </p>
        <p className="numeric mt-1 text-2xl font-semibold text-ink">
          {open.length}
        </p>
        {dueCount > 0 ? (
          <p className="mt-0.5 text-[11px] font-semibold text-danger">
            {t("ord.needAttention", "{n} need attention", { n: dueCount })}
          </p>
        ) : null}
      </div>

      <div className="flex gap-1 rounded-xl border border-line bg-card p-1">
        {(["open", "done"] as const).map((tk) => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              tab === tk ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {tk === "open"
              ? t("ord.tabOpen", "Open")
              : t("ord.tabDone", "Done / cancelled")}
          </button>
        ))}
      </div>

      {tab === "open" ? (
        open.length === 0 ? (
          <Empty text={t("ord.noneOpen", "No open orders — tap + to add one.")} />
        ) : (
          <div className="flex flex-col gap-4">
            {BUCKET_ORDER.filter((b) => grouped.get(b)?.length).map((b) => (
              <section key={b}>
                <h2
                  className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
                    b === "overdue"
                      ? "text-danger"
                      : b === "today" || b === "soon"
                        ? "text-gold"
                        : "text-muted"
                  }`}
                >
                  {t(`ord.bucket.${b}`, b)}
                </h2>
                <ul className="flex flex-col gap-2">
                  {grouped.get(b)!.map((o) => (
                    <OrderRow
                      key={o.id}
                      o={o}
                      t={t}
                      onClick={() => {
                        setEditing(false);
                        setDetail(o);
                      }}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : done.length === 0 ? (
        <Empty text={t("ord.noneDone", "Nothing finished yet.")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {done.map((o) => (
            <OrderRow
              key={o.id}
              o={o}
              t={t}
              onClick={() => {
                setEditing(false);
                setDetail(o);
              }}
            />
          ))}
        </ul>
      )}

      <button
        onClick={() => setAdding(true)}
        aria-label={t("ord.add", "Add order")}
        className="sticky bottom-4 z-30 mt-auto self-end h-14 w-14 rounded-full bg-forest text-2xl font-light text-paper shadow-lg active:scale-95"
      >
        +
      </button>

      {/* add */}
      <Sheet
        open={adding}
        title={t("ord.add", "Add order")}
        onClose={() => setAdding(false)}
      >
        <OrderForm
          parties={parties}
          products={products}
          submitLabel={t("c.save", "Save")}
          onSubmit={async (v) => {
            try {
              await addOrder(supabase, businessId, { id: newId("ord_"), ...v });
              setAdding(false);
              router.refresh();
            } catch {
              toast("Could not save the order.", "error");
            }
          }}
        />
      </Sheet>

      {/* detail / edit */}
      <Sheet
        open={detail !== null}
        title={detail ? detail.title || t("ord.order", "Order") : ""}
        onClose={() => {
          setDetail(null);
          setEditing(false);
        }}
      >
        {detail && editing ? (
          <OrderForm
            parties={parties}
            products={products}
            submitLabel={t("c.saveChanges", "Save changes")}
            initial={detail}
            onSubmit={async (v) => {
              try {
                await updateOrder(supabase, detail.id, {
                  title: v.title,
                  details: v.details,
                  amount: v.amount,
                  due_date: v.dueDate,
                  direction: v.direction,
                  party_type: v.partyType,
                  party_id: v.partyId,
                  party_name: v.partyName,
                });
                setEditing(false);
                setDetail(null);
                router.refresh();
              } catch {
                toast("Could not update the order.", "error");
              }
            }}
          />
        ) : detail ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted">
              {detail.direction === "in"
                ? t("ord.fromCustomer", "Order from {name}", {
                    name: detail.party_name || t("ord.aCustomer", "a customer"),
                  })
                : t("ord.toSupplier", "Order to {name}", {
                    name: detail.party_name || t("ord.aSupplier", "a supplier"),
                  })}
            </p>
            {detail.details ? (
              <p className="whitespace-pre-line rounded-lg border border-line bg-paper p-3 text-sm text-ink">
                {detail.details}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {detail.due_date ? (
                <span>
                  {t("ord.due", "Due")} {detail.due_date} ·{" "}
                  <DueText days={daysUntil(detail.due_date)} t={t} />
                </span>
              ) : (
                <span>{t("ord.noDue", "No due date")}</span>
              )}
              {Number(detail.amount) > 0 ? (
                <span className="numeric">{fmtRs(Number(detail.amount))}</span>
              ) : null}
              <span>{t(`ord.status.${detail.status}`, detail.status)}</span>
            </div>

            {detail.status === "open" ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => void mark(detail, "done")}
                  disabled={busy}
                  className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
                >
                  {detail.direction === "in"
                    ? t("ord.markSent", "Mark sent")
                    : t("ord.markReceived", "Mark received")}
                </button>
                <button
                  onClick={() => void mark(detail, "cancelled")}
                  disabled={busy}
                  className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted disabled:opacity-50"
                >
                  {t("ord.cancel", "Cancel order")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => void mark(detail, "open")}
                disabled={busy}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-forest disabled:opacity-50"
              >
                {t("ord.reopen", "Re-open")}
              </button>
            )}

            <button
              onClick={() => void shareAsPhoto(detail)}
              disabled={imgBusy}
              className="rounded-xl border border-forest/30 bg-forest/5 px-4 py-3 text-sm font-semibold text-forest disabled:opacity-50"
            >
              {imgBusy
                ? t("c.loading", "…")
                : t("ord.sharePhoto", "Share as photo (no prices)")}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEditing(true)}
                className="rounded-xl border border-forest/30 bg-forest/5 px-4 py-2.5 text-sm font-semibold text-forest"
              >
                {t("c.edit", "Edit")}
              </button>
              <button
                onClick={() => void remove(detail)}
                disabled={busy}
                className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-semibold text-danger disabled:opacity-50"
              >
                {t("c.delete", "Delete")}
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
      {text}
    </p>
  );
}

function DueText({
  days,
  t,
}: {
  days: number | null;
  t: ReturnType<typeof useT>;
}) {
  if (days == null) return null;
  if (days < 0)
    return (
      <span className="font-semibold text-danger">
        {t("ord.daysLate", "{n} days late", { n: -days })}
      </span>
    );
  if (days === 0)
    return <span className="font-semibold text-gold">{t("ord.today", "today")}</span>;
  if (days === 1)
    return <span className="text-gold">{t("ord.tomorrow", "tomorrow")}</span>;
  return <span>{t("ord.inDays", "in {n} days", { n: days })}</span>;
}

function OrderRow({
  o,
  t,
  onClick,
}: {
  o: Order;
  t: ReturnType<typeof useT>;
  onClick: () => void;
}) {
  const days = daysUntil(o.due_date);
  const late = o.status === "open" && days != null && days < 0;
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full rounded-xl border bg-card px-4 py-3 text-left ${
          late ? "border-danger/40" : "border-line"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {o.title || t("ord.order", "Order")}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {o.direction === "in" ? "← " : "→ "}
              {o.party_name ||
                (o.direction === "in"
                  ? t("ord.aCustomer", "a customer")
                  : t("ord.aSupplier", "a supplier"))}
              {o.status !== "open"
                ? ` · ${t(`ord.status.${o.status}`, o.status)}`
                : ""}
            </p>
          </div>
          <div className="shrink-0 text-right text-[11px]">
            {o.due_date ? <DueText days={days} t={t} /> : null}
            {Number(o.amount) > 0 ? (
              <p className="numeric text-muted">{fmtRs(Number(o.amount))}</p>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}

type FormValue = {
  direction: OrderDirection;
  partyType: "customer" | "supplier" | null;
  partyId: string | null;
  partyName: string | null;
  title: string;
  details: string | null;
  amount: number;
  dueDate: string | null;
};

function OrderForm({
  parties,
  products,
  submitLabel,
  initial,
  onSubmit,
}: {
  parties: PartyOpt[];
  products: Product[];
  submitLabel: string;
  initial?: Order;
  onSubmit: (v: FormValue) => void | Promise<void>;
}) {
  const t = useT();
  const [direction, setDirection] = useState<OrderDirection>(
    (initial?.direction as OrderDirection) ?? "out",
  );
  const [partyId, setPartyId] = useState(initial?.party_id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [details, setDetails] = useState(initial?.details ?? "");
  const [amount, setAmount] = useState(
    initial && Number(initial.amount) ? String(Number(initial.amount)) : "",
  );
  const [due, setDue] = useState(initial?.due_date ?? "");
  const [lines, setLines] = useState<ItemLine[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  // A delivery date can't be in the past.
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  })();

  const wantKind = direction === "in" ? "customer" : "supplier";
  const pickList = parties.filter((p) => p.kind === wantKind);
  const amt = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const cls =
    "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";

  // "Customer ordered" = they buy from us → sale prices. "I ordered" = we buy
  // from a supplier → purchase prices.
  const rateFrom = direction === "in" ? "sale" : "purchase";

  function addLines(picked: ItemLine[]) {
    if (picked.length === 0) return;
    const text = linesToText(picked);
    setDetails((n) => (n ? n + "\n" + text : text));
    setAmount(String(Math.round((amt + linesTotal(picked)) * 100) / 100));
    setLines((prev) => [...prev, ...picked]);
    setPicker(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-xl border border-line p-1">
        {(
          [
            ["out", t("ord.dirOut", "I ordered (supplier)")],
            ["in", t("ord.dirIn", "Customer ordered")],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => {
              setDirection(v);
              setPartyId("");
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              direction === v ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <select
        value={partyId}
        onChange={(e) => setPartyId(e.target.value)}
        className={cls}
      >
        <option value="">
          {direction === "in"
            ? t("ord.pickCustomer", "Which customer? (optional)")
            : t("ord.pickSupplier", "Which supplier? (optional)")}
        </option>
        {pickList.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("ord.titlePh", "What is the order?")}
        className={cls}
        autoFocus
      />

      {products.length > 0 ? (
        <button
          onClick={() => setPicker(true)}
          className="rounded-lg border border-line px-3 py-2.5 text-left text-sm font-semibold text-forest"
        >
          {t("party.addItem", "+ Add item from stock")}
        </button>
      ) : null}

      {lines.length > 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-forest/25 bg-forest/5 px-3 py-2 text-xs">
          <span className="font-semibold text-forest">
            {t("ord.itemsCount", "{n} items · {amt}", {
              n: lines.length,
              amt: fmtRs(linesTotal(lines)),
            })}
          </span>
          <button
            onClick={() => setLines([])}
            className="font-semibold text-muted underline underline-offset-2"
          >
            {t("party.clearItems", "Clear")}
          </button>
        </div>
      ) : null}

      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder={t("ord.detailsPh", "Details (optional)")}
        rows={3}
        className={`${cls} resize-none`}
      />

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-muted">
          {t("ord.dueDate", "Deliver by")}
          <input
            type="date"
            value={due}
            min={todayStr}
            onChange={(e) => setDue(e.target.value)}
            className={cls}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-muted">
          {t("ord.amountOpt", "Value (optional)")}
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            placeholder="0"
            className={cls}
          />
        </label>
      </div>

      <button
        onClick={async () => {
          const heading =
            title.trim() ||
            (lines.length
              ? lines.map((l) => `${l.qty} ${l.name}`).join(", ").slice(0, 80)
              : "");
          if (!heading || busy) return;
          setBusy(true);
          const p = pickList.find((x) => x.id === partyId) ?? null;
          await onSubmit({
            direction,
            partyType: p ? p.kind : null,
            partyId: p ? p.id : null,
            partyName: p ? p.name : null,
            title: heading,
            details: details.trim() || null,
            amount: Math.max(0, amt),
            // Can't newly set a past date; keep an existing one when editing.
            dueDate:
              due && (due >= todayStr || due === initial?.due_date)
                ? due
                : null,
          });
          setBusy(false);
        }}
        disabled={(!title.trim() && lines.length === 0) || busy}
        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? t("c.saving", "Saving…") : submitLabel}
      </button>

      {products.length > 0 ? (
        <ItemLinePicker
          open={picker}
          products={products}
          rateFrom={rateFrom}
          onClose={() => setPicker(false)}
          onDone={addLines}
        />
      ) : null}
    </div>
  );
}
