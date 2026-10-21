import fs from "fs";
import path from "path";
import { and, asc, eq, isNull, like, or, sql } from "drizzle-orm";
import { nowIso } from "@/lib/format";
import { parseSkuCsv, SKU_IMPORT_EXCLUDED_CODES, skuLabel, type ParsedSku } from "@/lib/sku-csv";
import type { Role } from "@/lib/types";
import { skus, type Sku } from "./schema";
import type { AppDb } from "./types";

export function bundledSkuCsvPath() {
  return path.join(process.cwd(), "data", "rakuten-products.csv");
}

export function readBundledSkuCsv() {
  const file = bundledSkuCsvPath();
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

export type SkuViewer = { id: string; role: Role };

function denied(viewer: SkuViewer) {
  return viewer.role !== "admin";
}

export function listSkus(
  db: AppDb,
  viewer: SkuViewer,
  filter: { q?: string | null; includeArchived?: boolean; limit?: number } = {},
) {
  if (denied(viewer)) return [];
  const conditions = [];
  if (!filter.includeArchived) conditions.push(isNull(skus.archivedAt));
  const needle = (filter.q ?? "").trim().replace(/[%_]/g, "");
  if (needle) {
    const pattern = `%${needle}%`;
    conditions.push(or(like(skus.name, pattern), like(skus.code, pattern), like(skus.variant, pattern), like(skus.subcategory, pattern)));
  }
  const query = db.select().from(skus);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(asc(skus.name), asc(skus.variant), asc(skus.code)).limit(filter.limit ?? 500).all();
}

export function listActiveSkus(db: AppDb, viewer: SkuViewer) {
  return listSkus(db, viewer, { limit: 1000 });
}

export function getSku(db: AppDb, viewer: SkuViewer, id: string) {
  if (denied(viewer)) return null;
  return db.select().from(skus).where(eq(skus.id, id)).get() ?? null;
}

export function searchSkus(db: AppDb, q: string, limit = 20) {
  return listSkus(db, { id: "api", role: "admin" }, { q, limit });
}

export type SkuInput = {
  code: string | null;
  name: string;
  variant: string;
  category: string | null;
  subcategory: string | null;
  salePrice: number;
  cost: number;
};

export function saveSku(
  db: AppDb,
  viewer: SkuViewer,
  skuId: string | null,
  input: SkuInput,
): { ok: true; id: string } | { ok: false; message: string } {
  if (denied(viewer)) return { ok: false, message: "找不到頁面。" };
  const name = input.name.trim();
  if (!name) return { ok: false, message: "請填商品名稱。" };
  if (name.length > 200) return { ok: false, message: "商品名稱太長。" };
  const variant = input.variant.trim();
  if (variant.length > 200) return { ok: false, message: "規格太長。" };
  const code = input.code?.trim() || null;
  if (code && code.length > 80) return { ok: false, message: "商品編號太長。" };
  if (code && SKU_IMPORT_EXCLUDED_CODES.has(code)) return { ok: false, message: "這個商品編號已下架，不能建立。" };
  const clash = db
    .select()
    .from(skus)
    .where(and(eq(skus.name, name), eq(skus.variant, variant), code ? eq(skus.code, code) : isNull(skus.code)))
    .all()
    .find((row) => row.id !== skuId);
  if (clash) return { ok: false, message: "已經有相同名稱、規格和編號的商品。" };

  const now = nowIso();
  if (!skuId) {
    const id = crypto.randomUUID();
    db.insert(skus)
      .values({
        id,
        importKey: null,
        code,
        name,
        variant,
        category: input.category?.trim() || null,
        subcategory: input.subcategory?.trim() || null,
        salePrice: input.salePrice,
        cost: input.cost,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return { ok: true, id };
  }
  const current = db.select().from(skus).where(eq(skus.id, skuId)).get();
  if (!current) return { ok: false, message: "找不到商品。" };
  db.update(skus)
    .set({
      code,
      name,
      variant,
      category: input.category?.trim() || null,
      subcategory: input.subcategory?.trim() || null,
      salePrice: input.salePrice,
      cost: input.cost,
      updatedAt: now,
    })
    .where(eq(skus.id, skuId))
    .run();
  return { ok: true, id: skuId };
}

export function setSkuArchived(db: AppDb, viewer: SkuViewer, skuId: string, archived: boolean) {
  if (denied(viewer)) return { ok: false as const, message: "找不到頁面。" };
  const current = db.select().from(skus).where(eq(skus.id, skuId)).get();
  if (!current) return { ok: false as const, message: "找不到商品。" };
  db.update(skus)
    .set({ archivedAt: archived ? nowIso() : null, updatedAt: nowIso() })
    .where(eq(skus.id, skuId))
    .run();
  return { ok: true as const };
}

export function importSkuCsv(db: AppDb, text: string) {
  const parsed = parseSkuCsv(text);
  const now = nowIso();
  let created = 0;
  let updated = 0;
  db.transaction((tx) => {
    for (const sku of parsed.skus) {
      const existing = tx.select().from(skus).where(eq(skus.importKey, sku.importKey)).get();
      if (!existing) {
        tx.insert(skus)
          .values({
            id: sku.id,
            importKey: sku.importKey,
            code: sku.code,
            name: sku.name,
            variant: sku.variant,
            category: sku.category,
            subcategory: sku.subcategory,
            salePrice: sku.salePrice,
            cost: sku.cost,
            archivedAt: null,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        created += 1;
        continue;
      }
      tx.update(skus)
        .set({
          code: sku.code ?? existing.code,
          name: sku.name,
          variant: sku.variant,
          category: sku.category,
          subcategory: sku.subcategory,
          salePrice: sku.salePrice,
          cost: sku.cost,
          updatedAt: now,
        })
        .where(eq(skus.id, existing.id))
        .run();
      updated += 1;
    }
    for (const code of SKU_IMPORT_EXCLUDED_CODES) {
      tx.update(skus)
        .set({ archivedAt: now, updatedAt: now })
        .where(and(eq(skus.code, code), isNull(skus.archivedAt)))
        .run();
    }
  });
  return { created, updated, excluded: parsed.excluded, failed: parsed.failed, parsed: parsed.skus.length };
}

export function importBundledSkusIfEmpty(db: AppDb) {
  const count = db.select({ value: sql<number>`count(*)` }).from(skus).get()?.value ?? 0;
  if (count > 0) return null;
  const text = readBundledSkuCsv();
  if (!text) return null;
  return importSkuCsv(db, text);
}

export function skuChoices(rows: Sku[]) {
  return rows.map((sku) => ({
    id: sku.id,
    code: sku.code,
    name: sku.name,
    variant: sku.variant,
    subcategory: sku.subcategory,
    salePrice: sku.salePrice,
    label: skuLabel(sku),
  }));
}

export type { ParsedSku };
