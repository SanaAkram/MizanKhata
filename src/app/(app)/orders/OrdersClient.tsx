"use client";

import { toast } from "@/lib/toast";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { newId } from "@/lib/ids";
import { fmtEntryDate, fmtRs } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useOrderPrefs } from "@/lib/khata/order-prefs";
import {
  addOrder,
  buildOrderReport,
  daysUntil,
  itemKey,
  deleteOrder,
  nextFridayStr,
  orderBucket,
  productHistory,
  replaceOrderItems,
  setOrderStatus,
  updateOrder,
  type Order,
  type OrderBucket,
  type OrderDirection,
  type OrderItem,
  type OrderItemLine,
  type OrderReportRow,
} from "@/lib/khata/orders";
import type { Product } from "@/lib/khata/shop-db";
import type { Business } from "@/lib/khata/business";
import { receiptImage, shareImage } from "@/lib/khata/receipt-image";
import Sheet from "@/components/Sheet";
import FullPage from "@/components/FullPage";
import { WhatsAppIcon } from "@/components/icons";
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
  business,
  premium,
  orders,
  items,
  parties,
  products,
}: {
  businessId: string;
  businessName: string;
  business: Business | null;
  premium: boolean;
  orders: Order[];
  items: OrderItem[];
  parties: PartyOpt[];
  products: Product[];
}) {
  const brand = (premium && business?.logo_color) || undefined;
  const logoUrl = premium && business?.logo_url ? business.logo_url : null;
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useT();
  const prefs = useOrderPrefs();
  const [tab, setTab] = useState<"open" | "done" | "report">("open");
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  // Report tab: which demand rows are picked to bundle into one supplier
  // order (key -> quantity), and whether the "pick a supplier" sheet is open.
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [allocSheet, setAllocSheet] = useState(false);
  const [historyRow, setHistoryRow] = useState<OrderReportRow | null>(null);

  const open = useMemo(
    () => orders.filter((o) => o.status === "open"),
    [orders],
  );
  const done = useMemo(
    () => orders.filter((o) => o.status !== "open"),
    [orders],
  );
  const dueCount = open.filter((o) => {
    const b = orderBucket(o, prefs);
    return b === "overdue" || b === "today" || b === "soon";
  }).length;

  const grouped = useMemo(() => {
    const m = new Map<OrderBucket, Order[]>();
    for (const o of open) {
      const b = orderBucket(o, prefs);
      const arr = m.get(b) ?? [];
      arr.push(o);
      m.set(b, arr);
    }
    return m;
  }, [open, prefs]);

  // A stable, human-friendly "Order #N" — position in creation order,
  // not the random id — for the order list rows.
  const orderNumberById = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const m = new Map<string, number>();
    sorted.forEach((o, i) => m.set(o.id, i + 1));
    return m;
  }, [orders]);

  const reportIn = useMemo(() => buildOrderReport(open, items, "in"), [open, items]);

  // How much of each product has already been put on order with a supplier
  // (open or already received — either way it's in motion), so the "split
  // this demand across suppliers" flow can show what's left to place.
  const nonCancelled = useMemo(
    () => orders.filter((o) => o.status !== "cancelled"),
    [orders],
  );
  const allocatedOut = useMemo(
    () => buildOrderReport(nonCancelled, items, "out"),
    [nonCancelled, items],
  );
  const allocatedByKey = useMemo(
    () => new Map(allocatedOut.map((r) => [r.key, r.totalQty])),
    [allocatedOut],
  );

  const historyEntries = useMemo(
    () => (historyRow ? productHistory(orders, items, historyRow.key) : []),
    [historyRow, orders, items],
  );

  // Only supplier orders actually marked "done" (received), not just
  // placed — for deciding whether a customer's order is fully sourced.
  const receivedByKey = useMemo(() => {
    const doneOut = orders.filter((o) => o.direction === "out" && o.status === "done");
    return new Map(buildOrderReport(doneOut, items, "out").map((r) => [r.key, r.totalQty]));
  }, [orders, items]);

  // Open customer orders where every one of their products has now been
  // fully received from suppliers (pooled across everyone waiting on that
  // product) — ready to close automatically, no manual "Mark sent" needed.
  const autoCompleteIds = useMemo(() => {
    const demandByKey = new Map(reportIn.map((r) => [r.key, r.totalQty]));
    const ids: string[] = [];
    for (const o of open) {
      if (o.direction !== "in") continue;
      const its = items.filter((it) => it.order_id === o.id);
      if (its.length === 0) continue; // no structured items — can't verify, leave alone
      const fullyReceived = its.every((it) => {
        const key = itemKey(it);
        const demand = demandByKey.get(key) ?? 0;
        const received = receivedByKey.get(key) ?? 0;
        return demand > 0 && received >= demand;
      });
      if (fullyReceived) ids.push(o.id);
    }
    return ids;
  }, [open, items, reportIn, receivedByKey]);

  const autoCompletedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const todo = autoCompleteIds.filter((id) => !autoCompletedRef.current.has(id));
    if (todo.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const id of todo) {
        autoCompletedRef.current.add(id);
        try {
          await setOrderStatus(supabase, id, "done");
        } catch {
          autoCompletedRef.current.delete(id);
        }
      }
      if (!cancelled) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [autoCompleteIds, supabase, router]);

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

  async function shareAsPhoto(o: Pick<Order, "id" | "title" | "details" | "due_date">) {
    setImgBusy(true);
    try {
      const stem = (o.title || "list")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24);

      // Prefer this order's own structured lines — a proper ITEM/QTY table.
      // Only an order from before that feature (or one typed free-hand)
      // falls back to pulling qty + name lines out of the details text.
      const orderItems = items.filter((it) => it.order_id === o.id);
      let qtyItems: { name: string; qty: string }[] | undefined;
      let rows: { left: string }[] = [];
      let note: string | null = null;

      if (orderItems.length) {
        qtyItems = orderItems.map((it) => ({
          name: it.name,
          qty: `${Number(it.qty).toLocaleString("en-US", { maximumFractionDigits: 2 })}${
            it.unit ? ` ${it.unit}` : ""
          }`,
        }));
      } else {
        // details may be "qty name" lines (ledger) OR "qty name <rate>Rs"
        // lines (Order Book form) OR free text. Split off a note after a
        // blank line, then strip any trailing price.
        const [itemsBlock, ...rest] = (o.details ?? "").split("\n\n");
        rows = (itemsBlock || o.title)
          .split("\n")
          .map((s) => s.trim().replace(/\s+[\d,.]+\s*Rs\.?$/i, ""))
          .filter(Boolean)
          .map((left) => ({ left }));
        note = rest.join("\n\n").replace(/\s+[\d,.]+\s*Rs\.?/gi, "") || null;
      }

      const blob = await receiptImage({
        shopName: businessName || "MizanKhata",
        heading: t("ord.orderSlip", "ORDER"),
        // No party name — this list is sent to a supplier; the customer is private.
        dateText: o.due_date
          ? `${t("ord.due", "Due")} ${o.due_date}`
          : undefined,
        rows,
        qtyItems,
        note,
        brand,
        logoUrl,
      });
      await shareImage(
        blob,
        `order-${stem || o.id.slice(-6)}.png`,
        t("ord.orderSlip", "ORDER"),
      );
    } catch {
      toast("Could not make the image.", "error");
    } finally {
      setImgBusy(false);
    }
  }

  // Splits one or more customer-demand rows (from the Report tab) off to a
  // single supplier: makes one new "out" order carrying all the picked
  // products at their picked quantities, then shares it as one no-price
  // photo — same "Order Book" shape as a manually-created multi-item
  // order, just pre-filled from the report rows.
  async function allocateToSupplier(
    picks: { row: OrderReportRow; qty: number }[],
    supplierId: string,
  ) {
    const supplier = parties.find((p) => p.id === supplierId && p.kind === "supplier");
    const valid = picks.filter((p) => p.qty > 0);
    if (!supplier || valid.length === 0) return;
    setBusy(true);
    try {
      const lines = valid.map(({ row, qty }) => {
        const product = products.find((p) => p.id === row.key);
        return {
          productId: product?.id ?? null,
          name: row.name,
          unit: row.unit,
          qty,
          rate: product?.purchase_price ?? 0,
        };
      });
      const id = newId("ord_");
      const heading = lines.map((l) => `${l.qty} ${l.name}`).join(", ").slice(0, 80);
      const detailsText = lines.map((l) => `${l.qty} ${l.name}`).join("\n");
      const amount =
        Math.round(lines.reduce((s, l) => s + l.qty * l.rate, 0) * 100) / 100;
      await addOrder(supabase, businessId, {
        id,
        direction: "out",
        partyType: "supplier",
        partyId: supplier.id,
        partyName: supplier.name,
        title: heading,
        details: detailsText,
        amount,
        dueDate: null,
        items: lines,
      });
      setAllocSheet(false);
      setSelected({});
      await shareAsPhoto({ id, title: heading, details: detailsText, due_date: null });
      router.refresh();
    } catch {
      toast("Could not create the supplier order.", "error");
    } finally {
      setBusy(false);
    }
  }

  function openOrderFromReport(orderId: string) {
    const o = orders.find((x) => x.id === orderId);
    if (!o) return;
    setEditing(false);
    setDetail(o);
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
        {(["open", "done", "report"] as const).map((tk) => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              tab === tk ? "bg-forest text-paper" : "text-muted"
            }`}
          >
            {tk === "open"
              ? t("ord.tabOpen", "Open")
              : tk === "done"
                ? t("ord.tabDone", "Done / cancelled")
                : t("ord.tabReport", "Report")}
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
                      number={orderNumberById.get(o.id) ?? 0}
                      items={items}
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
      ) : tab === "done" ? (
        done.length === 0 ? (
          <Empty text={t("ord.noneDone", "Nothing finished yet.")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {done.map((o) => (
              <OrderRow
                key={o.id}
                o={o}
                number={orderNumberById.get(o.id) ?? 0}
                items={items}
                t={t}
                onClick={() => {
                  setEditing(false);
                  setDetail(o);
                }}
              />
            ))}
          </ul>
        )
      ) : (
        <DemandSection
          rows={reportIn}
          allocatedByKey={allocatedByKey}
          selected={selected}
          onToggle={(row, checked) =>
            setSelected((s) => {
              const next = { ...s };
              if (checked) {
                const allocated = allocatedByKey.get(row.key) ?? 0;
                const remaining = Math.round((row.totalQty - allocated) * 100) / 100;
                // Nothing left unordered (or already over-ordered) doesn't
                // mean there's nothing TO order — default to the full
                // quantity so checking the box never pre-fills a qty of 0
                // (which would silently drop it when creating the order).
                next[row.key] = remaining > 0 ? remaining : row.totalQty;
              } else {
                delete next[row.key];
              }
              return next;
            })
          }
          onQtyChange={(key, qty) => setSelected((s) => ({ ...s, [key]: qty }))}
          onOpenOrder={openOrderFromReport}
          onOpenHistory={setHistoryRow}
          t={t}
        />
      )}

      {/* full history for one product: every order it's been on, who with, when */}
      <FullPage
        open={historyRow !== null}
        title={historyRow?.name ?? ""}
        onClose={() => setHistoryRow(null)}
      >
        <div className="flex flex-col gap-3">
          {historyRow ? (
            <div className="rounded-xl border border-forest/30 bg-forest/5 px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                {t("ord.orderedOfTotal", "{done} of {total} {unit} ordered", {
                  done: Math.round(
                    historyEntries.reduce((s, h) => s + h.qty, 0) * 100,
                  ) / 100,
                  total: historyRow.totalQty,
                  unit: historyRow.unit,
                })}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {t("ord.supplierOrdersFor", "Supplier orders for this product")}
              </p>
            </div>
          ) : null}
          {historyEntries.length === 0 ? (
            <Empty text={t("ord.noHistory", "No orders yet.")} />
          ) : (
            historyEntries.map((h, i) => (
              <button
                key={`${h.orderId}-${i}`}
                type="button"
                onClick={() => {
                  setHistoryRow(null);
                  openOrderFromReport(h.orderId);
                }}
                className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-ink">
                    {h.partyName || t("ord.aSupplier", "a supplier")}
                  </p>
                  <p className="numeric shrink-0 text-sm font-semibold text-forest">
                    {h.qty} {h.unit}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">
                  {fmtEntryDate(h.date)} · {t(`ord.status.${h.status}`, h.status)}
                </p>
              </button>
            ))
          )}
        </div>
      </FullPage>

      {tab === "report" && Object.keys(selected).length > 0 ? (
        <div className="sticky bottom-20 z-20 flex items-center justify-between gap-3 rounded-xl border border-forest/30 bg-card px-4 py-3 shadow-lg">
          <p className="text-xs font-semibold text-ink">
            {t("ord.itemsSelected", "{n} item{s} selected", {
              n: Object.keys(selected).length,
              s: Object.keys(selected).length === 1 ? "" : "s",
            })}
          </p>
          <button
            onClick={() => setAllocSheet(true)}
            className="shrink-0 rounded-lg bg-forest px-3 py-2 text-xs font-semibold text-paper"
          >
            {t("ord.orderFromSupplier", "Order from supplier")}
          </button>
        </div>
      ) : null}

      {/* bundle the picked demand rows into one supplier order, no-price photo */}
      <Sheet
        open={allocSheet}
        title={t("ord.orderFromSupplier", "Order from supplier")}
        onClose={() => setAllocSheet(false)}
      >
        {allocSheet ? (
          <MultiAllocateForm
            picks={reportIn
              .filter((r) => r.key in selected)
              .map((row) => ({ row, qty: selected[row.key] }))}
            suppliers={parties.filter((p) => p.kind === "supplier")}
            busy={busy || imgBusy}
            onSubmit={(supplierId, picks) => void allocateToSupplier(picks, supplierId)}
          />
        ) : null}
      </Sheet>

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
            initialItems={items.filter((it) => it.order_id === detail.id)}
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
                await replaceOrderItems(supabase, businessId, detail.id, v.items);
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
            {orderNumberById.get(detail.id) ? (
              <p className="text-xs font-semibold text-muted">
                {t("ord.orderNum", "Order #{n}", {
                  n: orderNumberById.get(detail.id) ?? 0,
                })}
              </p>
            ) : null}
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
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {imgBusy ? t("c.loading", "…") : t("party.shareWa", "Send on WhatsApp")}
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

/** A chip per contributing order — tapping one opens that order's normal
 *  detail sheet (Edit / Share as photo / Delete), so a report row is also
 *  how you find a specific order again to resend or fix it. */
function PartyChips({
  parties,
  onOpenOrder,
  t,
}: {
  parties: OrderReportRow["parties"];
  onOpenOrder: (orderId: string) => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {parties.map((p, i) => (
        <button
          key={`${p.orderId}-${i}`}
          type="button"
          onClick={() => onOpenOrder(p.orderId)}
          className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted underline-offset-2 active:bg-line"
        >
          {p.name || t("ord.aParty", "someone")} ({p.qty})
        </button>
      ))}
    </div>
  );
}

/** Customer-demand rows: checkable, with an editable quantity, so several
 *  products can be picked at once and bundled into one supplier order. */
function DemandSection({
  rows,
  allocatedByKey,
  selected,
  onToggle,
  onQtyChange,
  onOpenOrder,
  onOpenHistory,
  t,
}: {
  rows: ReturnType<typeof buildOrderReport>;
  allocatedByKey: Map<string, number>;
  selected: Record<string, number>;
  onToggle: (row: OrderReportRow, checked: boolean) => void;
  onQtyChange: (key: string, qty: number) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenHistory: (row: OrderReportRow) => void;
  t: ReturnType<typeof useT>;
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {t("ord.reportIn", "Customers are waiting for")}
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const allocated = allocatedByKey.get(r.key) ?? 0;
          const remaining = Math.max(0, Math.round((r.totalQty - allocated) * 100) / 100);
          const checked = r.key in selected;
          return (
            <li
              key={r.key}
              onClick={() => onOpenHistory(r)}
              className={`cursor-pointer rounded-xl border px-4 py-3 active:bg-line/50 ${
                checked ? "border-forest/40 bg-forest/5" : "border-line bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onToggle(r, e.target.checked)}
                  className="h-6 w-6 shrink-0 accent-forest"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                    <p className="numeric shrink-0 text-sm font-semibold text-forest">
                      {r.totalQty} {r.unit}
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-9">
                <div onClick={(e) => e.stopPropagation()}>
                  <PartyChips parties={r.parties} onOpenOrder={onOpenOrder} t={t} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                  {remaining <= 0 && allocated > 0 ? (
                    <span
                      aria-label={t("ord.fullyOrdered", "Fully ordered")}
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-ok text-paper"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-2.5 w-2.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : null}
                  {allocated > 0
                    ? t("ord.orderedOfTotal", "{done} of {total} {unit} ordered", {
                        done: allocated,
                        total: r.totalQty,
                        unit: r.unit,
                      })
                    : t("ord.noneOrderedYet", "None ordered from suppliers yet")}
                </p>
                {checked ? (
                  <input
                    onClick={(e) => e.stopPropagation()}
                    value={String(selected[r.key])}
                    onChange={(e) =>
                      onQtyChange(
                        r.key,
                        Math.max(0, parseFloat(e.target.value.replace(/[^\d.]/g, "")) || 0),
                      )
                    }
                    inputMode="decimal"
                    className="mt-2 w-24 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MultiAllocateForm({
  picks,
  suppliers,
  busy,
  onSubmit,
}: {
  picks: { row: OrderReportRow; qty: number }[];
  suppliers: PartyOpt[];
  busy: boolean;
  onSubmit: (supplierId: string, picks: { row: OrderReportRow; qty: number }[]) => void;
}) {
  const t = useT();
  const [supplierId, setSupplierId] = useState("");
  const cls =
    "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1">
        {picks.map(({ row, qty }) => (
          <li key={row.key} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">{row.name}</span>
            <span className="numeric shrink-0 text-muted">
              {qty} {row.unit}
            </span>
          </li>
        ))}
      </ul>
      <select
        value={supplierId}
        onChange={(e) => setSupplierId(e.target.value)}
        className={cls}
        autoFocus
      >
        <option value="">{t("ord.pickSupplier", "Which supplier? (optional)")}</option>
        {suppliers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => onSubmit(supplierId, picks)}
        disabled={!supplierId || picks.length === 0 || busy}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {busy ? (
          t("c.saving", "Saving…")
        ) : (
          <>
            <WhatsAppIcon className="h-4 w-4" />
            {t("ord.createAndShare", "Create & send on WhatsApp")}
          </>
        )}
      </button>
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
  number,
  items,
  t,
  onClick,
}: {
  o: Order;
  number: number;
  items: OrderItem[];
  t: ReturnType<typeof useT>;
  onClick: () => void;
}) {
  const days = daysUntil(o.due_date);
  const late = o.status === "open" && days != null && days < 0;
  const orderItems = items.filter((it) => it.order_id === o.id);
  const itemLines =
    orderItems.length > 0
      ? orderItems.map((it) => `${it.qty} ${it.name}`)
      : [o.title || t("ord.order", "Order")];
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full rounded-xl border bg-card px-4 py-3 text-left ${
          late ? "border-danger/40" : "border-line"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {number > 0 ? (
              <p className="text-[11px] font-semibold text-muted">
                {t("ord.orderNum", "Order #{n}", { n: number })}
              </p>
            ) : null}
            <div className="mt-0.5">
              {itemLines.map((line, i) => (
                <p key={i} className="truncate text-sm font-semibold text-ink">
                  {line}
                </p>
              ))}
            </div>
            <p className="mt-1 truncate text-[11px] text-muted">
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
  items: OrderItemLine[];
};

function OrderForm({
  parties,
  products,
  submitLabel,
  initial,
  initialItems,
  onSubmit,
}: {
  parties: PartyOpt[];
  products: Product[];
  submitLabel: string;
  initial?: Order;
  initialItems?: OrderItem[];
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
  const [due, setDue] = useState(initial?.due_date ?? nextFridayStr());
  const [lines, setLines] = useState<ItemLine[]>(
    () =>
      initialItems
        ?.filter((it) => it.product_id)
        .map((it) => ({
          productId: it.product_id as string,
          name: it.name,
          unit: it.unit,
          qty: Number(it.qty),
          rate: Number(it.rate),
        })) ?? [],
  );
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

  function clearLines() {
    // addLines() appended this exact text onto the end of `details` —
    // strip just that back off instead of leaving it stuck in the box.
    const itemsText = linesToText(lines);
    if (itemsText) {
      setDetails((n) => {
        if (n === itemsText) return "";
        if (n.endsWith("\n" + itemsText)) return n.slice(0, -(itemsText.length + 1));
        return n;
      });
    }
    setLines([]);
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
            onClick={clearLines}
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
            items: lines.map((l) => ({
              productId: l.productId,
              name: l.name,
              unit: l.unit,
              qty: l.qty,
              rate: l.rate,
            })),
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
