import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, like, lte, or, sql } from "drizzle-orm";
import { formatMoney, isSafeId, nowIso } from "@/lib/format";
import { goodsTotal, purchaseTotal, type PurchaseDraft } from "@/lib/purchase-input";
import { skuLabel } from "@/lib/sku-csv";
import type { Currency, Role } from "@/lib/types";
import { removeUpload, writeUpload } from "@/lib/uploads";
import { orders, purchaseAuditLogs, purchaseFiles, purchaseLines, purchases, skus, users } from "./schema";
import type { AppDb } from "./types";

export type PurchaseActor =
  | { kind: "user"; id: string; role: Role; label: string }
  | { kind: "api" };

export type PurchaseFileInput = { fileName: string; mimeType: string; buffer: Buffer };

function adminOnly(actor: PurchaseActor) {
  return actor.kind === "user" && actor.role !== "admin";
}

function actorFields(actor: PurchaseActor) {
  if (actor.kind === "api") return { actorId: null, actorLabel: "API" };
  return { actorId: actor.id, actorLabel: actor.label };
}

function addAudit(db: AppDb, purchaseId: string, actor: PurchaseActor, action: string, summary: string) {
  const who = actorFields(actor);
  db.insert(purchaseAuditLogs)
    .values({
      id: crypto.randomUUID(),
      purchaseId,
      actorId: who.actorId,
      actorLabel: who.actorLabel,
      action,
      summary,
      createdAt: nowIso(),
    })
    .run();
}

function moneySummary(draft: PurchaseDraft) {
  return `${draft.supplier}（${formatMoney(purchaseTotal(draft.lines, draft.shippingFee, draft.otherFees), draft.currency)}）`;
}

export function listSuppliers(db: AppDb, viewer: { role: Role }) {
  if (viewer.role !== "admin") return [];
  const rows = db
    .select({ supplier: purchases.supplier })
    .from(purchases)
    .where(isNull(purchases.deletedAt))
    .groupBy(purchases.supplier)
    .orderBy(asc(purchases.supplier))
    .all();
  return rows.map((row) => row.supplier);
}

export function listLinkableOrders(db: AppDb, viewer: { role: Role }) {
  if (viewer.role !== "admin") return [];
  return db
    .select({ id: orders.id, productName: orders.productName, helperName: users.displayName, purchasedOn: orders.dispatchedOn })
    .from(orders)
    .innerJoin(users, eq(orders.helperId, users.id))
    .where(isNull(orders.deletedAt))
    .orderBy(desc(orders.createdAt))
    .limit(80)
    .all();
}

export function listPurchases(
  db: AppDb,
  viewer: { role: Role },
  filter: {
    from?: string | null;
    to?: string | null;
    supplier?: string | null;
    skuId?: string | null;
    q?: string | null;
    includeDeleted?: boolean;
  },
) {
  if (viewer.role !== "admin") return [];
  const conditions = [filter.includeDeleted ? isNotNull(purchases.deletedAt) : isNull(purchases.deletedAt)];
  if (filter.from) conditions.push(gte(purchases.purchasedOn, filter.from));
  if (filter.to) conditions.push(lte(purchases.purchasedOn, filter.to));
  const supplier = (filter.supplier ?? "").trim();
  if (supplier) conditions.push(eq(purchases.supplier, supplier));
  const needle = (filter.q ?? "").trim().replace(/[%_]/g, "");
  if (needle) {
    const pattern = `%${needle}%`;
    conditions.push(or(like(purchases.supplier, pattern), like(purchases.notes, pattern), like(purchases.sourceSubject, pattern))!);
  }
  if (filter.skuId && isSafeId(filter.skuId)) {
    conditions.push(
      sql`exists (select 1 from purchase_lines where purchase_lines.purchase_id = purchases.id and purchase_lines.sku_id = ${filter.skuId})`,
    );
  }
  const rows = purchaseRows(db, and(...conditions));
  if (!needle) return rows;
  const matchedIds = new Set(rows.map((row) => row.id));
  const bySku = db
    .select({ purchaseId: purchaseLines.purchaseId })
    .from(purchaseLines)
    .innerJoin(skus, eq(purchaseLines.skuId, skus.id))
    .innerJoin(purchases, eq(purchaseLines.purchaseId, purchases.id))
    .where(
      and(
        filter.includeDeleted ? isNotNull(purchases.deletedAt) : isNull(purchases.deletedAt),
        filter.from ? gte(purchases.purchasedOn, filter.from) : undefined,
        filter.to ? lte(purchases.purchasedOn, filter.to) : undefined,
        supplier ? eq(purchases.supplier, supplier) : undefined,
        or(like(skus.name, `%${needle}%`), like(skus.code, `%${needle}%`), like(skus.variant, `%${needle}%`)),
      ),
    )
    .all();
  const extraIds = [...new Set(bySku.map((row) => row.purchaseId))].filter((id) => !matchedIds.has(id));
  if (extraIds.length === 0) return rows;
  const extras = purchaseRows(db, inArray(purchases.id, extraIds));
  return [...rows, ...extras].sort((a, b) => b.purchasedOn.localeCompare(a.purchasedOn) || b.id.localeCompare(a.id));
}

function purchaseRows(db: AppDb, where: ReturnType<typeof and> | ReturnType<typeof inArray>) {
  return db
    .select({
      id: purchases.id,
      purchasedOn: purchases.purchasedOn,
      supplier: purchases.supplier,
      currency: purchases.currency,
      shippingFee: purchases.shippingFee,
      otherFees: purchases.otherFees,
      sourceSubject: purchases.sourceSubject,
      deletedAt: purchases.deletedAt,
      goods: sql<number>`coalesce((select sum(quantity * unit_price) from purchase_lines where purchase_lines.purchase_id = purchases.id), 0)`,
      lineCount: sql<number>`(select count(*) from purchase_lines where purchase_lines.purchase_id = purchases.id)`,
    })
    .from(purchases)
    .where(where)
    .orderBy(desc(purchases.purchasedOn), desc(purchases.createdAt))
    .all();
}

export function getPurchase(db: AppDb, viewer: { role: Role }, id: string) {
  if (viewer.role !== "admin" || !isSafeId(id)) return null;
  const purchase = db.select().from(purchases).where(eq(purchases.id, id)).get();
  if (!purchase) return null;
  const lines = db
    .select({
      id: purchaseLines.id,
      skuId: purchaseLines.skuId,
      quantity: purchaseLines.quantity,
      unitPrice: purchaseLines.unitPrice,
      code: skus.code,
      name: skus.name,
      variant: skus.variant,
      subcategory: skus.subcategory,
    })
    .from(purchaseLines)
    .innerJoin(skus, eq(purchaseLines.skuId, skus.id))
    .where(eq(purchaseLines.purchaseId, id))
    .all()
    .map((line) => ({ ...line, label: skuLabel(line) }));
  const files = db.select().from(purchaseFiles).where(eq(purchaseFiles.purchaseId, id)).orderBy(asc(purchaseFiles.createdAt)).all();
  const audit = db
    .select()
    .from(purchaseAuditLogs)
    .where(eq(purchaseAuditLogs.purchaseId, id))
    .orderBy(desc(purchaseAuditLogs.createdAt))
    .all();
  const linked = purchase.orderId
    ? db
        .select({ id: orders.id, productName: orders.productName })
        .from(orders)
        .where(eq(orders.id, purchase.orderId))
        .get() ?? null
    : null;
  const goods = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return {
    ...purchase,
    lines,
    files,
    audit,
    linked,
    goods,
    total: goods + purchase.shippingFee + purchase.otherFees,
  };
}

export function getPurchaseFile(db: AppDb, id: string) {
  if (!isSafeId(id)) return null;
  return db.select().from(purchaseFiles).where(eq(purchaseFiles.id, id)).get() ?? null;
}

export function findPurchasesBySourceRef(db: AppDb, sourceRef: string) {
  return db
    .select({
      id: purchases.id,
      purchasedOn: purchases.purchasedOn,
      supplier: purchases.supplier,
      currency: purchases.currency,
      sourceRef: purchases.sourceRef,
      sourceSubject: purchases.sourceSubject,
      deletedAt: purchases.deletedAt,
    })
    .from(purchases)
    .where(eq(purchases.sourceRef, sourceRef))
    .orderBy(desc(purchases.createdAt))
    .all();
}

function validateDraft(db: AppDb, draft: PurchaseDraft, purchaseId: string | null) {
  if (draft.orderId) {
    const order = db.select({ id: orders.id }).from(orders).where(eq(orders.id, draft.orderId)).get();
    if (!order) return "找不到這張相關任務。";
  }
  for (const line of draft.lines) {
    const sku = db.select().from(skus).where(eq(skus.id, line.skuId)).get();
    if (!sku) return "有一項商品不存在。";
    if (sku.archivedAt) return `「${skuLabel(sku)}」已封存，請改選其他商品。`;
  }
  if (draft.sourceRef) {
    const clash = db
      .select({ id: purchases.id })
      .from(purchases)
      .where(and(eq(purchases.sourceRef, draft.sourceRef), isNull(purchases.deletedAt)))
      .all()
      .find((row) => row.id !== purchaseId);
    if (clash) return "這封信已經建過進貨單。";
  }
  return null;
}

function writeFiles(db: AppDb, purchaseId: string, files: PurchaseFileInput[]) {
  const written: string[] = [];
  try {
    for (const file of files) {
      const id = crypto.randomUUID();
      writeUpload(id, file.buffer);
      written.push(id);
      db.insert(purchaseFiles)
        .values({
          id,
          purchaseId,
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.buffer.length,
          createdAt: nowIso(),
        })
        .run();
    }
  } catch (error) {
    for (const id of written) removeUpload(id);
    throw error;
  }
}

export function createPurchase(
  db: AppDb,
  actor: PurchaseActor,
  draft: PurchaseDraft,
  files: PurchaseFileInput[],
): { ok: true; id: string; total: number; currency: Currency } | { ok: false; message: string; code?: "duplicate" } {
  if (adminOnly(actor)) return { ok: false, message: "找不到頁面。" };
  const invalid = validateDraft(db, draft, null);
  if (invalid) return { ok: false, message: invalid, code: invalid.includes("已經建過") ? "duplicate" : undefined };
  const id = crypto.randomUUID();
  const now = nowIso();
  try {
    db.transaction((tx) => {
      tx.insert(purchases)
        .values({
          id,
          purchasedOn: draft.purchasedOn,
          supplier: draft.supplier,
          currency: draft.currency,
          orderId: draft.orderId,
          shippingFee: draft.shippingFee,
          otherFees: draft.otherFees,
          notes: draft.notes,
          sourceRef: draft.sourceRef,
          sourceSubject: draft.sourceSubject,
          deletedAt: null,
          deletedBy: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      for (const line of draft.lines) {
        tx.insert(purchaseLines)
          .values({ id: crypto.randomUUID(), purchaseId: id, skuId: line.skuId, quantity: line.quantity, unitPrice: line.unitPrice })
          .run();
      }
      writeFiles(tx, id, files);
      addAudit(tx, id, actor, "purchase.created", `${actor.kind === "api" ? "API 建立進貨" : "建立進貨"}：${moneySummary(draft)}`);
    });
  } catch (error) {
    console.error(error);
    return { ok: false, message: "進貨沒有存成功，請再試一次。" };
  }
  return { ok: true, id, total: purchaseTotal(draft.lines, draft.shippingFee, draft.otherFees), currency: draft.currency };
}

export function updatePurchase(
  db: AppDb,
  actor: PurchaseActor,
  purchaseId: string,
  draft: PurchaseDraft,
  files: PurchaseFileInput[],
  removeFileIds: string[],
) {
  if (adminOnly(actor)) return { ok: false as const, message: "找不到頁面。" };
  if (!isSafeId(purchaseId)) return { ok: false as const, message: "找不到進貨單。" };
  const current = db.select().from(purchases).where(eq(purchases.id, purchaseId)).get();
  if (!current) return { ok: false as const, message: "找不到進貨單。" };
  if (current.deletedAt) return { ok: false as const, message: "這張進貨已刪除，請先還原。" };
  const invalid = validateDraft(db, draft, purchaseId);
  if (invalid) return { ok: false as const, message: invalid };
  const removed: string[] = [];
  try {
    db.transaction((tx) => {
      for (const fileId of removeFileIds) {
        if (!isSafeId(fileId)) continue;
        const file = tx.select().from(purchaseFiles).where(eq(purchaseFiles.id, fileId)).get();
        if (!file || file.purchaseId !== purchaseId) continue;
        tx.delete(purchaseFiles).where(eq(purchaseFiles.id, fileId)).run();
        removed.push(fileId);
      }
      tx.update(purchases)
        .set({
          purchasedOn: draft.purchasedOn,
          supplier: draft.supplier,
          currency: draft.currency,
          orderId: draft.orderId,
          shippingFee: draft.shippingFee,
          otherFees: draft.otherFees,
          notes: draft.notes,
          sourceRef: draft.sourceRef,
          sourceSubject: draft.sourceSubject,
          updatedAt: nowIso(),
        })
        .where(eq(purchases.id, purchaseId))
        .run();
      tx.delete(purchaseLines).where(eq(purchaseLines.purchaseId, purchaseId)).run();
      for (const line of draft.lines) {
        tx.insert(purchaseLines)
          .values({ id: crypto.randomUUID(), purchaseId, skuId: line.skuId, quantity: line.quantity, unitPrice: line.unitPrice })
          .run();
      }
      writeFiles(tx, purchaseId, files);
      addAudit(tx, purchaseId, actor, "purchase.updated", `修改進貨：${moneySummary(draft)}`);
    });
  } catch (error) {
    console.error(error);
    return { ok: false as const, message: "進貨沒有存成功，請再試一次。" };
  }
  for (const fileId of removed) removeUpload(fileId);
  return { ok: true as const, id: purchaseId };
}

export function softDeletePurchase(db: AppDb, actor: PurchaseActor, purchaseId: string) {
  if (adminOnly(actor)) return { ok: false as const, message: "找不到頁面。" };
  if (actor.kind !== "user") return { ok: false as const, message: "找不到頁面。" };
  if (!isSafeId(purchaseId)) return { ok: false as const, message: "找不到進貨單。" };
  const current = db.select().from(purchases).where(eq(purchases.id, purchaseId)).get();
  if (!current) return { ok: false as const, message: "找不到進貨單。" };
  if (current.deletedAt) return { ok: true as const };
  db.transaction((tx) => {
    tx.update(purchases)
      .set({ deletedAt: nowIso(), deletedBy: actor.id, updatedAt: nowIso() })
      .where(eq(purchases.id, purchaseId))
      .run();
    addAudit(tx, purchaseId, actor, "purchase.deleted", `刪除進貨：${current.supplier}`);
  });
  return { ok: true as const };
}

export function restorePurchase(db: AppDb, actor: PurchaseActor, purchaseId: string) {
  if (adminOnly(actor) || actor.kind !== "user") return { ok: false as const, message: "找不到頁面。" };
  if (!isSafeId(purchaseId)) return { ok: false as const, message: "找不到進貨單。" };
  const current = db.select().from(purchases).where(eq(purchases.id, purchaseId)).get();
  if (!current) return { ok: false as const, message: "找不到進貨單。" };
  if (!current.deletedAt) return { ok: true as const };
  db.transaction((tx) => {
    tx.update(purchases)
      .set({ deletedAt: null, deletedBy: null, updatedAt: nowIso() })
      .where(eq(purchases.id, purchaseId))
      .run();
    addAudit(tx, purchaseId, actor, "purchase.restored", `還原進貨：${current.supplier}`);
  });
  return { ok: true as const };
}

export function skuSpendReport(db: AppDb, viewer: { role: Role }, range: { from?: string | null; to?: string | null }) {
  if (viewer.role !== "admin") return [];
  const conditions = [isNull(purchases.deletedAt)];
  if (range.from) conditions.push(gte(purchases.purchasedOn, range.from));
  if (range.to) conditions.push(lte(purchases.purchasedOn, range.to));
  const rows = db
    .select({
      skuId: purchaseLines.skuId,
      currency: purchases.currency,
      quantity: sql<number>`sum(${purchaseLines.quantity})`,
      spend: sql<number>`sum(${purchaseLines.quantity} * ${purchaseLines.unitPrice})`,
      code: skus.code,
      name: skus.name,
      variant: skus.variant,
      category: skus.category,
      subcategory: skus.subcategory,
    })
    .from(purchaseLines)
    .innerJoin(purchases, eq(purchaseLines.purchaseId, purchases.id))
    .innerJoin(skus, eq(purchaseLines.skuId, skus.id))
    .where(and(...conditions))
    .groupBy(purchaseLines.skuId, purchases.currency)
    .orderBy(asc(skus.name), asc(skus.variant))
    .all();
  return rows;
}

export function reportToCsv(rows: ReturnType<typeof skuSpendReport>) {
  const header = ["商品編號", "商品名稱", "規格", "分類", "次分類", "幣別", "累計數量", "累計金額"];
  const lines = [header, ...rows.map((row) => [row.code ?? "", row.name, row.variant, row.category ?? "", row.subcategory ?? "", row.currency, row.quantity, row.spend])];
  const body = lines
    .map((columns) =>
      columns
        .map((value) => {
          const text = String(value ?? "");
          return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        })
        .join(","),
    )
    .join("\r\n");
  return `\uFEFF${body}\r\n`;
}

export { goodsTotal };
