import { asc, eq, max } from "drizzle-orm";
import { nowIso } from "@/lib/format";
import type { Viewer } from "@/lib/types";
import { productOptions, type ProductOption } from "./schema";
import type { AppDb } from "./types";

export function listProductOptions(db: AppDb, options?: { activeOnly?: boolean }) {
  const query = db.select().from(productOptions).orderBy(asc(productOptions.sortOrder), asc(productOptions.name));
  const rows = options?.activeOnly ? query.where(eq(productOptions.active, true)).all() : query.all();
  return rows;
}

export function getProductOption(db: AppDb, id: string) {
  return db.select().from(productOptions).where(eq(productOptions.id, id)).get() ?? null;
}

function cleanName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 1 || trimmed.length > 80) return null;
  return trimmed;
}

export function addProductOption(db: AppDb, actor: Viewer, name: string): { ok: true; option: ProductOption } | { ok: false; code: string } {
  if (actor.role !== "admin") return { ok: false, code: "forbidden" };
  const cleaned = cleanName(name);
  if (!cleaned) return { ok: false, code: "invalid" };
  const sortOrder = (db.select({ value: max(productOptions.sortOrder) }).from(productOptions).get()?.value ?? 0) + 1;
  const option: ProductOption = {
    id: crypto.randomUUID(),
    name: cleaned,
    active: true,
    sortOrder,
    createdAt: nowIso(),
  };
  try {
    db.insert(productOptions).values(option).run();
  } catch {
    return { ok: false, code: "product_taken" };
  }
  return { ok: true, option };
}

export function renameProductOption(db: AppDb, actor: Viewer, id: string, name: string) {
  if (actor.role !== "admin") return { ok: false as const, code: "forbidden" };
  const cleaned = cleanName(name);
  if (!cleaned) return { ok: false as const, code: "invalid" };
  const existing = getProductOption(db, id);
  if (!existing) return { ok: false as const, code: "not_found" };
  try {
    db.update(productOptions).set({ name: cleaned }).where(eq(productOptions.id, id)).run();
  } catch {
    return { ok: false as const, code: "product_taken" };
  }
  return { ok: true as const };
}

export function setProductOptionActive(db: AppDb, actor: Viewer, id: string, active: boolean) {
  if (actor.role !== "admin") return { ok: false as const, code: "forbidden" };
  const existing = getProductOption(db, id);
  if (!existing) return { ok: false as const, code: "not_found" };
  if (!active) {
    const activeCount = listProductOptions(db, { activeOnly: true }).filter((option) => option.id !== id).length;
    if (activeCount === 0) return { ok: false as const, code: "last_product" };
  }
  db.update(productOptions).set({ active }).where(eq(productOptions.id, id)).run();
  return { ok: true as const };
}
