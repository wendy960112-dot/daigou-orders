import { and, asc, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { formatMoney, isSafeId, nowIso, todayTaipei } from "@/lib/format";
import type { SummaryOrder } from "@/lib/summary";
import type { Currency, OrderInput, Viewer } from "@/lib/types";
import type { IncomingFile } from "@/lib/uploads";
import { removeUpload, writeUpload } from "@/lib/uploads";
import type { StatusFilter } from "@/lib/filters";
import { attachments, auditLogs, orders, users, type Attachment, type Order } from "./schema";
import type { AppDb } from "./types";

export type OrderListItem = Order & { helperName: string };

export type AuditEntry = {
  id: string;
  orderId: string;
  actorId: string;
  actorName: string;
  action: string;
  summary: string;
  createdAt: string;
};

const FIELD_LABELS: Record<string, string> = {
  productName: "商品名稱",
  productLinks: "商品連結",
  quantity: "數量",
  orderAmount: "訂購金額",
  orderCurrency: "訂購幣別",
  orderDate: "訂購日期",
  expectedArrivalDate: "預計到貨日",
  carrier: "物流公司",
  trackingNumber: "追蹤單號",
  shipDate: "寄出日期",
  shippingCost: "運費",
  shippingCurrency: "運費幣別",
  notes: "備註",
};

function statusWhere(status: StatusFilter | null) {
  if (status === "unpaid") return eq(orders.paid, false);
  if (status === "paid") return eq(orders.paid, true);
  if (status === "not_received") return eq(orders.goodsReceived, false);
  if (status === "received") return eq(orders.goodsReceived, true);
  if (status === "shipping_open") return and(eq(orders.shippingReimbursed, false), isNotNull(orders.shippingCost));
  if (status === "shipping_done") return eq(orders.shippingReimbursed, true);
  return undefined;
}

export function listOrders(
  db: AppDb,
  viewer: Viewer,
  filter: { helperId?: string | null; month?: string | null; status?: StatusFilter | null },
): OrderListItem[] {
  if (viewer.role === "pending") return [];
  const conditions = [];
  if (viewer.role === "helper") conditions.push(eq(orders.helperId, viewer.id));
  else if (filter.helperId) conditions.push(eq(orders.helperId, filter.helperId));
  if (filter.month) {
    conditions.push(gte(orders.orderDate, `${filter.month}-01`));
    conditions.push(lte(orders.orderDate, `${filter.month}-31`));
  }
  const status = statusWhere(filter.status ?? null);
  if (status) conditions.push(status);

  const query = db
    .select({ order: orders, helperName: users.displayName })
    .from(orders)
    .innerJoin(users, eq(orders.helperId, users.id));
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered
    .orderBy(desc(orders.orderDate), desc(orders.createdAt))
    .all()
    .map((row) => ({ ...row.order, helperName: row.helperName }));
}

export function listMonths(db: AppDb, helperId: string | null) {
  const query = db.select({ orderDate: orders.orderDate }).from(orders);
  const rows = helperId ? query.where(eq(orders.helperId, helperId)).all() : query.all();
  return [...new Set(rows.map((row) => row.orderDate.slice(0, 7)))].sort((a, b) => b.localeCompare(a));
}

export function getOrder(db: AppDb, id: string): OrderListItem | null {
  if (!isSafeId(id)) return null;
  const row = db
    .select({ order: orders, helperName: users.displayName })
    .from(orders)
    .innerJoin(users, eq(orders.helperId, users.id))
    .where(eq(orders.id, id))
    .get();
  if (!row) return null;
  return { ...row.order, helperName: row.helperName };
}

export function listAttachments(db: AppDb, orderId: string) {
  return db.select().from(attachments).where(eq(attachments.orderId, orderId)).orderBy(asc(attachments.createdAt)).all();
}

export function getAttachment(db: AppDb, id: string) {
  if (!isSafeId(id)) return null;
  return db.select().from(attachments).where(eq(attachments.id, id)).get() ?? null;
}

export function listAudit(db: AppDb, orderId: string): AuditEntry[] {
  return db
    .select({
      id: auditLogs.id,
      orderId: auditLogs.orderId,
      actorId: auditLogs.actorId,
      actorName: users.displayName,
      action: auditLogs.action,
      summary: auditLogs.summary,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.actorId, users.id))
    .where(eq(auditLogs.orderId, orderId))
    .orderBy(desc(auditLogs.createdAt))
    .all();
}

export function listSummaryOrders(db: AppDb, helperId?: string | null): SummaryOrder[] {
  const query = db
    .select({
      helperId: orders.helperId,
      helperName: users.displayName,
      orderDate: orders.orderDate,
      orderAmount: orders.orderAmount,
      orderCurrency: orders.orderCurrency,
      paid: orders.paid,
      paidAmount: orders.paidAmount,
      paidCurrency: orders.paidCurrency,
      shippingCost: orders.shippingCost,
      shippingCurrency: orders.shippingCurrency,
      shippingReimbursed: orders.shippingReimbursed,
    })
    .from(orders)
    .innerJoin(users, eq(orders.helperId, users.id));
  return (helperId ? query.where(eq(orders.helperId, helperId)) : query).all();
}

function addAudit(
  tx: AppDb,
  input: { orderId: string; actorId: string; action: string; summary: string; detail?: unknown },
) {
  tx.insert(auditLogs)
    .values({
      id: crypto.randomUUID(),
      orderId: input.orderId,
      actorId: input.actorId,
      action: input.action,
      summary: input.summary,
      detail: input.detail === undefined ? null : JSON.stringify(input.detail),
      createdAt: nowIso(),
    })
    .run();
}

function storeFiles(tx: AppDb, orderId: string, actorId: string, files: IncomingFile[]) {
  const written: string[] = [];
  try {
    for (const file of files) {
      const id = crypto.randomUUID();
      writeUpload(id, file.buffer);
      written.push(id);
      tx.insert(attachments)
        .values({
          id,
          orderId,
          kind: file.kind,
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.buffer.length,
          createdAt: nowIso(),
        })
        .run();
      addAudit(tx, {
        orderId,
        actorId,
        action: "attachment.added",
        summary: file.kind === "order_proof" ? `上傳訂單截圖：${file.fileName}` : `上傳運費收據：${file.fileName}`,
      });
    }
  } catch (error) {
    for (const id of written) removeUpload(id);
    throw error;
  }
}

export function createOrder(
  db: AppDb,
  actorId: string,
  input: OrderInput,
  files: IncomingFile[],
): { ok: true; id: string } | { ok: false; message: string } {
  const id = crypto.randomUUID();
  const now = nowIso();
  try {
    db.transaction((tx) => {
      tx.insert(orders)
        .values({
          id,
          ...input,
          paid: false,
          paidAt: null,
          paidAmount: null,
          paidCurrency: null,
          goodsReceived: false,
          goodsReceivedAt: null,
          shippingReimbursed: false,
          shippingReimbursedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      addAudit(tx, {
        orderId: id,
        actorId,
        action: "order.created",
        summary: `建立訂單：${input.productName}（${formatMoney(input.orderAmount, input.orderCurrency)}）`,
      });
      storeFiles(tx, id, actorId, files);
    });
  } catch (error) {
    console.error(error);
    return { ok: false, message: "訂單沒有存成功，請再試一次。" };
  }
  return { ok: true, id };
}

export function updateOrder(
  db: AppDb,
  actorId: string,
  orderId: string,
  input: OrderInput,
  files: IncomingFile[],
): { ok: true } | { ok: false; message: string } {
  const current = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!current) return { ok: false, message: "找不到訂單" };

  const changed = (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).filter((key) => {
    const before = current[key as keyof Order] ?? null;
    const after = input[key as keyof OrderInput] ?? null;
    return before !== after;
  });

  try {
    db.transaction((tx) => {
      tx.update(orders)
        .set({ ...input, updatedAt: nowIso() })
        .where(eq(orders.id, orderId))
        .run();
      if (changed.length > 0) {
        addAudit(tx, {
          orderId,
          actorId,
          action: "order.updated",
          summary: `更新了：${changed.map((key) => FIELD_LABELS[key]).join("、")}`,
        });
      }
      storeFiles(tx, orderId, actorId, files);
    });
  } catch (error) {
    console.error(error);
    return { ok: false, message: "訂單沒有存成功，請再試一次。" };
  }
  return { ok: true };
}

export function deleteAttachment(
  db: AppDb,
  actor: Viewer,
  attachmentId: string,
): { ok: true; orderId: string } | { ok: false; code: string } {
  const attachment = getAttachment(db, attachmentId);
  if (!attachment) return { ok: false, code: "not_found" };
  const order = getOrder(db, attachment.orderId);
  if (!order) return { ok: false, code: "not_found" };
  if (actor.role === "helper" && order.helperId !== actor.id) return { ok: false, code: "forbidden" };
  if (actor.role === "pending") return { ok: false, code: "forbidden" };
  db.delete(attachments).where(eq(attachments.id, attachmentId)).run();
  removeUpload(attachmentId);
  addAudit(db, {
    orderId: order.id,
    actorId: actor.id,
    action: "attachment.deleted",
    summary: `刪除了附件：${attachment.fileName}`,
  });
  db.update(orders).set({ updatedAt: nowIso() }).where(eq(orders.id, order.id)).run();
  return { ok: true, orderId: order.id };
}

function paidLabel(date: string | null, amount: number | null, currency: Currency | null) {
  if (amount == null || !currency) return "已匯款";
  const when = date ? `${date.replaceAll("-", "/")}、` : "";
  return `${when}${formatMoney(amount, currency)}`;
}

export function changeStatus(
  db: AppDb,
  actor: Viewer,
  orderId: string,
  input: {
    paid: boolean;
    paidAt: string | null;
    paidAmount: number | null;
    paidCurrency: Currency | null;
    goodsReceived: boolean;
    shippingReimbursed: boolean;
  },
): { ok: true; code: string } | { ok: false; code: string } {
  if (actor.role !== "admin") return { ok: false, code: "forbidden" };
  const current = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!current) return { ok: false, code: "not_found" };
  if (input.shippingReimbursed && current.shippingCost == null) return { ok: false, code: "need_shipping" };

  const paidAt = input.paid ? input.paidAt ?? todayTaipei() : null;
  const paidAmount = input.paid ? input.paidAmount ?? current.orderAmount : null;
  const paidCurrency = input.paid ? input.paidCurrency ?? current.orderCurrency : null;
  const goodsReceivedAt = input.goodsReceived ? current.goodsReceivedAt ?? nowIso() : null;
  const shippingReimbursedAt = input.shippingReimbursed ? current.shippingReimbursedAt ?? nowIso() : null;

  const audits: { action: string; summary: string }[] = [];
  const paidChanged =
    current.paid !== input.paid ||
    (current.paidAt ?? null) !== paidAt ||
    (current.paidAmount ?? null) !== paidAmount ||
    (current.paidCurrency ?? null) !== paidCurrency;
  if (paidChanged) {
    audits.push({
      action: "status.paid",
      summary: input.paid ? `勾選已匯款（${paidLabel(paidAt, paidAmount, paidCurrency)}）` : "取消已匯款",
    });
  }
  if (current.goodsReceived !== input.goodsReceived) {
    audits.push({
      action: "status.received",
      summary: input.goodsReceived ? "勾選已收到貨" : "取消已收到貨",
    });
  }
  if (current.shippingReimbursed !== input.shippingReimbursed) {
    audits.push({
      action: "status.shipping",
      summary: input.shippingReimbursed ? "勾選運費已報銷" : "取消運費已報銷",
    });
  }

  if (audits.length === 0) return { ok: true, code: "status_same" };

  db.transaction((tx) => {
    tx.update(orders)
      .set({
        paid: input.paid,
        paidAt,
        paidAmount,
        paidCurrency,
        goodsReceived: input.goodsReceived,
        goodsReceivedAt,
        shippingReimbursed: input.shippingReimbursed,
        shippingReimbursedAt,
        updatedAt: nowIso(),
      })
      .where(eq(orders.id, orderId))
      .run();
    for (const entry of audits) addAudit(tx, { orderId, actorId: actor.id, ...entry });
  });
  return { ok: true, code: "status" };
}

export function countKind(rows: Attachment[], kind: Attachment["kind"]) {
  return rows.filter((row) => row.kind === kind).length;
}
