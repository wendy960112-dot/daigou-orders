import { and, asc, count, desc, eq, gte, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { formatMoney, isSafeId, nowIso, todayTaipei } from "@/lib/format";
import { formatProxyFields, parseProxyFields } from "@/lib/proxy";
import type { SummaryOrder } from "@/lib/summary";
import type { DeliveryMethod, TaskStatus } from "@/lib/tasks";
import type { AttachmentKind, Currency, OrderInput, Viewer } from "@/lib/types";
import type { IncomingFile } from "@/lib/uploads";
import { orderProofMessage, removeUpload, writeUpload } from "@/lib/uploads";
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

const listedOn = sql<string>`coalesce(${orders.orderDate}, ${orders.dispatchedOn})`;

function taskWhere(task: TaskStatus | null) {
  if (task === "pending" || task === "accepted") return eq(orders.taskStatus, task);
  if (task === "ordered") {
    return or(
      eq(orders.taskStatus, "ordered"),
      and(isNull(orders.taskStatus), isNull(orders.shipDate), isNull(orders.trackingNumber), isNull(orders.carrier)),
    );
  }
  if (task === "shipped") {
    return or(
      eq(orders.taskStatus, "shipped"),
      and(isNull(orders.taskStatus), or(isNotNull(orders.shipDate), isNotNull(orders.trackingNumber), isNotNull(orders.carrier))),
    );
  }
  return undefined;
}

export function listOrders(
  db: AppDb,
  viewer: Viewer,
  filter: {
    helperId?: string | null;
    month?: string | null;
    status?: StatusFilter | null;
    task?: TaskStatus | null;
    includeDeleted?: boolean;
  },
): OrderListItem[] {
  if (viewer.role === "pending") return [];
  if (filter.includeDeleted && viewer.role !== "admin") return [];
  const conditions = [filter.includeDeleted ? isNotNull(orders.deletedAt) : isNull(orders.deletedAt)];
  if (viewer.role === "helper") conditions.push(eq(orders.helperId, viewer.id));
  else if (filter.helperId) conditions.push(eq(orders.helperId, filter.helperId));
  if (filter.month) {
    conditions.push(gte(listedOn, `${filter.month}-01`));
    conditions.push(lte(listedOn, `${filter.month}-31`));
  }
  const status = statusWhere(filter.status ?? null);
  if (status) conditions.push(status);
  const task = taskWhere(filter.task ?? null);
  if (task) conditions.push(task);

  const query = db
    .select({ order: orders, helperName: users.displayName })
    .from(orders)
    .innerJoin(users, eq(orders.helperId, users.id));
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered
    .orderBy(filter.includeDeleted ? desc(orders.deletedAt) : desc(listedOn), desc(orders.createdAt))
    .all()
    .map((row) => ({ ...row.order, helperName: row.helperName }));
}

export function listMonths(db: AppDb, helperId: string | null) {
  const visible = isNull(orders.deletedAt);
  const query = db.select({ listedOn: sql<string | null>`coalesce(${orders.orderDate}, ${orders.dispatchedOn})` }).from(orders);
  const rows = query.where(helperId ? and(visible, eq(orders.helperId, helperId)) : visible).all();
  return [...new Set(rows.map((row) => row.listedOn?.slice(0, 7)).filter((month): month is string => Boolean(month)))].sort(
    (a, b) => b.localeCompare(a),
  );
}

export function countInbox(db: AppDb, helperId: string) {
  return (
    db
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.helperId, helperId), eq(orders.taskStatus, "pending"), isNull(orders.deletedAt)))
      .get()?.value ?? 0
  );
}

export function listInbox(db: AppDb, helperId: string) {
  return listOrders(db, { id: helperId, role: "helper" }, { task: "pending", month: null });
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
  const visible = isNull(orders.deletedAt);
  return query.where(helperId ? and(visible, eq(orders.helperId, helperId)) : visible)
    .all()
    .flatMap((row) => {
      if (row.orderAmount == null || row.orderCurrency == null || row.orderDate == null) return [];
      return [{ ...row, orderAmount: row.orderAmount, orderCurrency: row.orderCurrency, orderDate: row.orderDate }];
    });
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

function attachmentSummary(kind: AttachmentKind, fileName: string) {
  if (kind === "order_proof") return `上傳訂單截圖：${fileName}`;
  if (kind === "shipping_receipt") return `上傳運費收據：${fileName}`;
  if (kind === "payment_proof") return `上傳匯款截圖：${fileName}`;
  return `上傳運費報銷截圖：${fileName}`;
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
        summary: attachmentSummary(file.kind, file.fileName),
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
          taskStatus: input.shipDate || input.trackingNumber || input.carrier ? "shipped" : "ordered",
          dispatchedOn: input.orderDate,
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
  if (order.deletedAt && actor.role !== "admin") return { ok: false, code: "not_found" };
  if (actor.role === "helper" && order.helperId !== actor.id) return { ok: false, code: "forbidden" };
  if (actor.role === "pending") return { ok: false, code: "forbidden" };
  if ((attachment.kind === "payment_proof" || attachment.kind === "reimbursement_proof") && actor.role !== "admin") {
    return { ok: false, code: "forbidden" };
  }
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
  if (!current || current.deletedAt) return { ok: false, code: current ? "deleted_locked" : "not_found" };
  if (input.paid && (current.orderAmount == null || current.orderCurrency == null)) return { ok: false, code: "need_amount" };
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

export type DispatchInput = {
  helperId: string;
  productOptionId: string;
  productName: string;
  productLinks: string;
  purchaseNote: string;
  dispatchedOn: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
};

export function dispatchTask(
  db: AppDb,
  actorId: string,
  input: DispatchInput,
): { ok: true; id: string } | { ok: false; message: string } {
  const id = crypto.randomUUID();
  const now = nowIso();
  try {
    db.transaction((tx) => {
      tx.insert(orders)
        .values({
          id,
          helperId: input.helperId,
          productOptionId: input.productOptionId,
          productName: input.productName,
          productLinks: input.productLinks,
          purchaseNote: input.purchaseNote,
          quantity: null,
          orderAmount: null,
          orderCurrency: null,
          orderDate: null,
          dispatchedOn: input.dispatchedOn,
          expectedArrivalDate: null,
          deliveryMethod: input.deliveryMethod,
          deliveryAddress: input.deliveryAddress,
          taskStatus: "pending",
          carrier: null,
          trackingNumber: null,
          shipDate: null,
          shippingCost: null,
          shippingCurrency: null,
          notes: null,
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
        action: "task.dispatched",
        summary: `派發任務：${input.productName}`,
      });
    });
  } catch (error) {
    console.error(error);
    return { ok: false, message: "任務沒有派出去，請再試一次。" };
  }
  return { ok: true, id };
}

export function acceptTask(db: AppDb, actor: Viewer, orderId: string) {
  if (actor.role !== "helper") return { ok: false as const, code: "forbidden" };
  if (!isSafeId(orderId)) return { ok: false as const, code: "not_found" };
  const current = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!current || current.helperId !== actor.id || current.deletedAt) return { ok: false as const, code: "not_found" };
  if (current.taskStatus !== "pending") return { ok: false as const, code: "not_pending" };
  db.transaction((tx) => {
    tx.update(orders).set({ taskStatus: "accepted", updatedAt: nowIso() }).where(eq(orders.id, orderId)).run();
    addAudit(tx, { orderId, actorId: actor.id, action: "task.accepted", summary: "接下任務" });
  });
  return { ok: true as const };
}

function dropProxyFields(current: string | null, keys: string[]) {
  const fields = parseProxyFields(current);
  for (const key of keys) {
    if (key) fields.delete(key);
  }
  return formatProxyFields(fields);
}

function addProxyFields(current: string | null, keys: string[]) {
  const fields = parseProxyFields(current);
  for (const key of keys) {
    if (key) fields.add(key);
  }
  return formatProxyFields(fields);
}

export type FulfillInput = {
  productOptionId: string | null;
  productName: string;
  orderAmount: number;
  orderCurrency: Currency;
  orderDate: string;
  carrier: string | null;
  trackingNumber: string | null;
  shipDate: string | null;
  shippingCost: number | null;
  shippingCurrency: Currency | null;
  notes: string | null;
};

export function fulfillOrder(
  db: AppDb,
  actor: Viewer,
  orderId: string,
  input: FulfillInput,
  files: IncomingFile[],
): { ok: true } | { ok: false; message: string } {
  if (actor.role !== "helper") return { ok: false, message: "只有小幫手可以回報下單。" };
  const current = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!current || current.helperId !== actor.id || current.deletedAt) return { ok: false, message: "找不到訂單" };
  if (current.taskStatus === "pending") return { ok: false, message: "請先接下這張單。" };

  const nextStatus: TaskStatus = input.shipDate || input.trackingNumber || input.carrier ? "shipped" : "ordered";
  try {
    db.transaction((tx) => {
      tx.update(orders)
        .set({
          productOptionId: input.productOptionId,
          productName: input.productName,
          orderAmount: input.orderAmount,
          orderCurrency: input.orderCurrency,
          orderDate: input.orderDate,
          carrier: input.carrier,
          trackingNumber: input.trackingNumber,
          shipDate: input.shipDate,
          shippingCost: input.shippingCost,
          shippingCurrency: input.shippingCurrency,
          notes: input.notes,
          taskStatus: nextStatus,
          proxyFields: dropProxyFields(current.proxyFields, [
            current.productName !== input.productName ? "productName" : "",
            (current.orderAmount ?? null) !== input.orderAmount ? "orderAmount" : "",
            (current.orderDate ?? null) !== input.orderDate ? "orderDate" : "",
            (current.trackingNumber ?? null) !== input.trackingNumber ? "trackingNumber" : "",
            (current.shipDate ?? null) !== input.shipDate ? "shipDate" : "",
            (current.shippingCost ?? null) !== input.shippingCost ? "shippingCost" : "",
            (current.notes ?? null) !== input.notes ? "notes" : "",
            (current.carrier ?? null) !== input.carrier ? "carrier" : "",
            files.some((file) => file.kind === "order_proof") ? "orderProof" : "",
          ]),
          updatedAt: nowIso(),
        })
        .where(eq(orders.id, orderId))
        .run();
      const changed = [
        current.productName !== input.productName ? "商品名稱" : "",
        (current.orderAmount ?? null) !== input.orderAmount || current.orderCurrency !== input.orderCurrency ? "訂購金額" : "",
        (current.orderDate ?? null) !== input.orderDate ? "訂購日期" : "",
        (current.carrier ?? null) !== input.carrier ? "物流公司" : "",
        (current.trackingNumber ?? null) !== input.trackingNumber ? "追蹤單號" : "",
        (current.shipDate ?? null) !== input.shipDate ? "寄出日期" : "",
        (current.shippingCost ?? null) !== input.shippingCost ? "運費" : "",
        (current.notes ?? null) !== input.notes ? "備註" : "",
        current.taskStatus !== nextStatus ? (nextStatus === "shipped" ? "已寄出" : "已下單") : "",
      ].filter(Boolean);
      if (changed.length > 0) {
        addAudit(tx, {
          orderId,
          actorId: actor.id,
          action: "task.fulfilled",
          summary: `回報下單：${formatMoney(input.orderAmount, input.orderCurrency)}（${changed.join("、")}）`,
        });
      }
      storeFiles(tx, orderId, actor.id, files);
    });
  } catch (error) {
    console.error(error);
    return { ok: false, message: "訂單沒有存成功，請再試一次。" };
  }
  return { ok: true };
}

export type AdminEditInput = {
  helperId: string;
  helperName: string;
  productOptionId: string;
  productName: string;
  productLinks: string;
  purchaseNote: string;
  dispatchedOn: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
  saveReport: boolean;
  markAccepted: boolean;
  report: Omit<FulfillInput, "productOptionId" | "productName"> | null;
  paid: boolean;
  paidAt: string | null;
  paidAmount: number | null;
  paidCurrency: Currency | null;
  goodsReceived: boolean;
  shippingReimbursed: boolean;
};

export function adminEditOrder(
  db: AppDb,
  actor: Viewer,
  orderId: string,
  input: AdminEditInput,
  files: IncomingFile[],
  removeIds: string[],
): { ok: true } | { ok: false; message: string } {
  if (actor.role !== "admin") return { ok: false, message: "只有管理員可以代填。" };
  if (!isSafeId(orderId)) return { ok: false, message: "找不到訂單" };
  const current = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!current) return { ok: false, message: "找不到訂單" };
  if (current.deletedAt) return { ok: false, message: "這張任務已刪除，請先還原。" };

  const report = input.saveReport ? input.report : null;
  const nextAmount = report ? report.orderAmount : current.orderAmount;
  const nextCurrency = report ? report.orderCurrency : current.orderCurrency;
  const nextShipping = report ? report.shippingCost : current.shippingCost;
  if (input.paid && (nextAmount == null || nextCurrency == null)) return { ok: false, message: "小幫手還沒回報訂購金額，先不要勾已匯款。" };
  if (input.shippingReimbursed && nextShipping == null) return { ok: false, message: "請先填好運費金額，才能勾選運費已報銷。" };
  if (report) {
    const existingProofs = db
      .select()
      .from(attachments)
      .where(and(eq(attachments.orderId, orderId), eq(attachments.kind, "order_proof")))
      .all();
    const removing = new Set(removeIds);
    const kept = existingProofs.filter((row) => !removing.has(row.id)).length;
    const proofError = orderProofMessage(kept, files.filter((file) => file.kind === "order_proof").length);
    if (proofError) return { ok: false, message: proofError };
  }

  let nextStatus = current.taskStatus;
  if (report) nextStatus = report.shipDate || report.trackingNumber ? "shipped" : "ordered";
  else if (input.markAccepted && current.taskStatus === "pending") nextStatus = "accepted";

  const paidAt = input.paid ? input.paidAt ?? todayTaipei() : null;
  const paidAmount = input.paid ? input.paidAmount ?? nextAmount : null;
  const paidCurrency = input.paid ? input.paidCurrency ?? nextCurrency : null;
  const goodsReceivedAt = input.goodsReceived ? current.goodsReceivedAt ?? nowIso() : null;
  const shippingReimbursedAt = input.shippingReimbursed ? current.shippingReimbursedAt ?? nowIso() : null;

  const changed: string[] = [];
  const proxyKeys: string[] = [];
  if (current.helperId !== input.helperId) {
    changed.push(`改派給${input.helperName}`);
    proxyKeys.push("helper");
  }
  if (current.productName !== input.productName) {
    changed.push("商品名稱");
    proxyKeys.push("productName");
  }
  if ((current.purchaseNote ?? null) !== input.purchaseNote) {
    changed.push("下單內容");
    proxyKeys.push("purchaseNote");
  }
  if ((current.productLinks ?? null) !== input.productLinks) {
    changed.push("商品連結");
    proxyKeys.push("productLinks");
  }
  if ((current.dispatchedOn ?? null) !== input.dispatchedOn) {
    changed.push("派發日期");
    proxyKeys.push("dispatchedOn");
  }
  if ((current.deliveryMethod ?? null) !== input.deliveryMethod || (current.deliveryAddress ?? null) !== input.deliveryAddress) {
    changed.push("交貨形式");
    proxyKeys.push("delivery");
  }
  if (report) {
    if ((current.orderAmount ?? null) !== report.orderAmount || current.orderCurrency !== report.orderCurrency) {
      changed.push("訂購金額");
      proxyKeys.push("orderAmount");
    }
    if ((current.orderDate ?? null) !== report.orderDate) {
      changed.push("訂購日期");
      proxyKeys.push("orderDate");
    }
    if ((current.trackingNumber ?? null) !== report.trackingNumber) {
      changed.push("追蹤單號");
      proxyKeys.push("trackingNumber");
    }
    if ((current.shipDate ?? null) !== report.shipDate) {
      changed.push("寄出日期");
      proxyKeys.push("shipDate");
    }
    if ((current.shippingCost ?? null) !== report.shippingCost) {
      changed.push("運費");
      proxyKeys.push("shippingCost");
    }
    if ((current.notes ?? null) !== report.notes) {
      changed.push("備註");
      proxyKeys.push("notes");
    }
    if ((current.carrier ?? null) !== report.carrier) {
      changed.push("物流公司");
      proxyKeys.push("carrier");
    }
  }
  if (current.taskStatus !== nextStatus) {
    changed.push(nextStatus === "shipped" ? "已寄出" : nextStatus === "ordered" ? "已下單" : "代為接下");
  }
  if (files.some((file) => file.kind === "order_proof")) proxyKeys.push("orderProof");

  const paidChanged =
    current.paid !== input.paid ||
    (current.paidAt ?? null) !== paidAt ||
    (current.paidAmount ?? null) !== paidAmount ||
    (current.paidCurrency ?? null) !== paidCurrency;
  const receivedChanged = current.goodsReceived !== input.goodsReceived;
  const shippingPaidChanged = current.shippingReimbursed !== input.shippingReimbursed;

  const removed: string[] = [];
  try {
    db.transaction((tx) => {
      for (const id of removeIds) {
        if (!isSafeId(id)) continue;
        const row = tx.select().from(attachments).where(eq(attachments.id, id)).get();
        if (!row || row.orderId !== orderId) continue;
        tx.delete(attachments).where(eq(attachments.id, id)).run();
        addAudit(tx, { orderId, actorId: actor.id, action: "attachment.deleted", summary: `刪除了附件：${row.fileName}` });
        removed.push(id);
        if (row.kind === "order_proof") proxyKeys.push("orderProof");
      }
      tx.update(orders)
        .set({
          helperId: input.helperId,
          productOptionId: input.productOptionId,
          productName: input.productName,
          productLinks: input.productLinks,
          purchaseNote: input.purchaseNote,
          dispatchedOn: input.dispatchedOn,
          deliveryMethod: input.deliveryMethod,
          deliveryAddress: input.deliveryAddress,
          ...(report
            ? {
                orderAmount: report.orderAmount,
                orderCurrency: report.orderCurrency,
                orderDate: report.orderDate,
                carrier: report.carrier,
                trackingNumber: report.trackingNumber,
                shipDate: report.shipDate,
                shippingCost: report.shippingCost,
                shippingCurrency: report.shippingCurrency,
                notes: report.notes,
              }
            : {}),
          taskStatus: nextStatus,
          paid: input.paid,
          paidAt,
          paidAmount,
          paidCurrency,
          goodsReceived: input.goodsReceived,
          goodsReceivedAt,
          shippingReimbursed: input.shippingReimbursed,
          shippingReimbursedAt,
          proxyFields: addProxyFields(current.proxyFields, proxyKeys),
          updatedAt: nowIso(),
        })
        .where(eq(orders.id, orderId))
        .run();
      if (changed.length > 0 || files.length > 0) {
        const money = report ? formatMoney(report.orderAmount, report.orderCurrency) : "";
        const detail = [money, ...changed].filter(Boolean).join("、");
        addAudit(tx, {
          orderId,
          actorId: actor.id,
          action: "order.proxy_filled",
          summary: `由管理員代填${detail ? `：${detail}` : ""}`,
        });
      }
      if (paidChanged) {
        addAudit(tx, {
          orderId,
          actorId: actor.id,
          action: "status.paid",
          summary: input.paid ? `勾選已匯款（${paidLabel(paidAt, paidAmount, paidCurrency)}）` : "取消已匯款",
        });
      }
      if (receivedChanged) {
        addAudit(tx, {
          orderId,
          actorId: actor.id,
          action: "status.received",
          summary: input.goodsReceived ? "勾選已收到貨" : "取消已收到貨",
        });
      }
      if (shippingPaidChanged) {
        addAudit(tx, {
          orderId,
          actorId: actor.id,
          action: "status.shipping",
          summary: input.shippingReimbursed ? "勾選運費已報銷" : "取消運費已報銷",
        });
      }
      storeFiles(tx, orderId, actor.id, files);
    });
  } catch (error) {
    console.error(error);
    return { ok: false, message: "沒有存成功，請再試一次。" };
  }
  for (const id of removed) removeUpload(id);
  return { ok: true };
}

export function addAttachments(
  db: AppDb,
  actor: Viewer,
  orderId: string,
  files: IncomingFile[],
): { ok: true } | { ok: false; message: string } {
  if (actor.role !== "admin") return { ok: false, message: "只有管理員可以上傳這份截圖。" };
  const order = getOrder(db, orderId);
  if (!order || order.deletedAt) return { ok: false, message: order ? "這張任務已刪除，請先還原。" : "找不到訂單" };
  if (files.length === 0) return { ok: true };
  try {
    db.transaction((tx) => {
      storeFiles(tx, orderId, actor.id, files);
      tx.update(orders).set({ updatedAt: nowIso() }).where(eq(orders.id, orderId)).run();
    });
  } catch (error) {
    console.error(error);
    return { ok: false, message: "截圖沒有上傳成功，請再試一次。" };
  }
  return { ok: true };
}

function moneyFlags(order: { paid: boolean; shippingReimbursed: boolean }) {
  return [order.paid ? "已匯款" : "", order.shippingReimbursed ? "運費已報銷" : ""].filter(Boolean);
}

export function softDeleteOrder(db: AppDb, actor: Viewer, orderId: string) {
  if (actor.role !== "admin") return { ok: false as const, code: "forbidden" };
  if (!isSafeId(orderId)) return { ok: false as const, code: "not_found" };
  const current = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!current) return { ok: false as const, code: "not_found" };
  if (current.deletedAt) return { ok: true as const, code: "deleted_order" as const };
  const flags = moneyFlags(current);
  const note = flags.length > 0 ? `（${flags.join("、")}）` : "";
  db.transaction((tx) => {
    tx.update(orders)
      .set({ deletedAt: nowIso(), deletedBy: actor.id, updatedAt: nowIso() })
      .where(eq(orders.id, orderId))
      .run();
    addAudit(tx, {
      orderId,
      actorId: actor.id,
      action: "order.deleted",
      summary: `刪除任務：${current.productName}${note}`,
    });
  });
  return { ok: true as const, code: "deleted_order" as const };
}

export function restoreOrder(db: AppDb, actor: Viewer, orderId: string) {
  if (actor.role !== "admin") return { ok: false as const, code: "forbidden" };
  if (!isSafeId(orderId)) return { ok: false as const, code: "not_found" };
  const current = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!current) return { ok: false as const, code: "not_found" };
  if (!current.deletedAt) return { ok: true as const, code: "restored" as const };
  db.transaction((tx) => {
    tx.update(orders)
      .set({ deletedAt: null, deletedBy: null, updatedAt: nowIso() })
      .where(eq(orders.id, orderId))
      .run();
    addAudit(tx, {
      orderId,
      actorId: actor.id,
      action: "order.restored",
      summary: `還原任務：${current.productName}`,
    });
  });
  return { ok: true as const, code: "restored" as const };
}

export function countKind(rows: Attachment[], kind: Attachment["kind"]) {
  return rows.filter((row) => row.kind === kind).length;
}
