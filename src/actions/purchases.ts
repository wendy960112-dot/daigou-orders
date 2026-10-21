"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { createPurchase, getPurchase, restorePurchase, softDeletePurchase, updatePurchase } from "@/db/purchases";
import { importSkuCsv, readBundledSkuCsv, saveSku, setSkuArchived } from "@/db/skus";
import { getCurrentUser } from "@/lib/current-user";
import { isSafeId } from "@/lib/format";
import { parsePurchaseForm } from "@/lib/purchase-input";
import type { ActionState } from "@/lib/types";
import { fileFromBuffer } from "@/lib/uploads";

function refresh() {
  revalidatePath("/purchases");
  revalidatePath("/purchases/report");
  revalidatePath("/purchases/skus");
}

async function adminUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

async function screenshotsFromForm(form: FormData) {
  const values = form.getAll("screenshots").filter((value): value is File => value instanceof File && value.size > 0);
  if (values.length > 8) return { ok: false as const, message: "訂單截圖最多 8 個。" };
  const files = [];
  for (const file of values) {
    const parsed = fileFromBuffer(file.name, Buffer.from(await file.arrayBuffer()));
    if (!parsed.ok) return parsed;
    files.push(parsed.file);
  }
  return { ok: true as const, files };
}

export async function savePurchaseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await adminUser();
  if (!user) return { ok: false, message: "找不到頁面。" };
  const parsed = parsePurchaseForm(form);
  if (!parsed.ok) return parsed;
  const screenshots = await screenshotsFromForm(form);
  if (!screenshots.ok) return screenshots;
  const purchaseId = String(form.get("purchaseId") ?? "");
  const db = getDb();
  const actor = { kind: "user" as const, id: user.id, role: user.role, label: user.displayName };
  if (purchaseId) {
    if (!isSafeId(purchaseId)) return { ok: false, message: "找不到進貨單。" };
    const existing = getPurchase(db, user, purchaseId);
    if (!existing) return { ok: false, message: "找不到進貨單。" };
    const removeIds = form.getAll("removeFile").filter((value): value is string => typeof value === "string");
    const kept = existing.files.filter((file) => !removeIds.includes(file.id)).length;
    if (kept + screenshots.files.length > 8) return { ok: false, message: "訂單截圖最多 8 個。" };
    const saved = updatePurchase(db, actor, purchaseId, parsed.data, screenshots.files, removeIds);
    if (!saved.ok) return { ok: false, message: saved.message };
    refresh();
    redirect(`/purchases/${purchaseId}?notice=purchase_saved`);
  }
  const created = createPurchase(db, actor, parsed.data, screenshots.files);
  if (!created.ok) return { ok: false, message: created.message };
  refresh();
  redirect(`/purchases/${created.id}?notice=purchase_saved`);
}

export async function removePurchase(form: FormData) {
  const user = await adminUser();
  if (!user) redirect("/");
  const purchaseId = String(form.get("purchaseId") ?? "");
  const result = softDeletePurchase(getDb(), { kind: "user", id: user.id, role: user.role, label: user.displayName }, purchaseId);
  if (!result.ok) redirect(isSafeId(purchaseId) ? `/purchases/${purchaseId}?notice=not_found` : "/purchases?notice=not_found");
  refresh();
  redirect("/purchases/deleted?notice=purchase_deleted");
}

export async function restorePurchaseAction(form: FormData) {
  const user = await adminUser();
  if (!user) redirect("/");
  const purchaseId = String(form.get("purchaseId") ?? "");
  const result = restorePurchase(getDb(), { kind: "user", id: user.id, role: user.role, label: user.displayName }, purchaseId);
  if (!result.ok) redirect("/purchases/deleted?notice=not_found");
  refresh();
  redirect(`/purchases/${purchaseId}?notice=purchase_restored`);
}

function readSkuInput(form: FormData) {
  const sale = String(form.get("salePrice") ?? "").trim();
  const cost = String(form.get("cost") ?? "").trim();
  if (sale && !/^\d+$/.test(sale)) return { ok: false as const, message: "售價請填 0 以上的整數。" };
  if (cost && !/^\d+$/.test(cost)) return { ok: false as const, message: "成本請填 0 以上的整數。" };
  return {
    ok: true as const,
    data: {
      code: String(form.get("code") ?? ""),
      name: String(form.get("name") ?? ""),
      variant: String(form.get("variant") ?? ""),
      category: String(form.get("category") ?? ""),
      subcategory: String(form.get("subcategory") ?? ""),
      salePrice: sale ? Number(sale) : 0,
      cost: cost ? Number(cost) : 0,
    },
  };
}

export async function saveSkuAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await adminUser();
  if (!user) return { ok: false, message: "找不到頁面。" };
  const parsed = readSkuInput(form);
  if (!parsed.ok) return parsed;
  const skuId = String(form.get("skuId") ?? "").trim();
  const saved = saveSku(getDb(), user, skuId || null, parsed.data);
  if (!saved.ok) return saved;
  refresh();
  redirect(`/purchases/skus/${saved.id}?notice=sku_saved`);
}

export async function archiveSkuAction(form: FormData) {
  const user = await adminUser();
  if (!user) redirect("/");
  const skuId = String(form.get("skuId") ?? "");
  const archived = form.get("archived") === "1";
  const result = setSkuArchived(getDb(), user, skuId, archived);
  if (!result.ok) redirect("/purchases/skus?notice=not_found");
  refresh();
  redirect(`/purchases/skus?notice=${archived ? "sku_archived" : "sku_restored"}`);
}

export type ImportState = ActionState & { failures?: { row: number; reason: string }[] };

export async function importSkusAction(_prev: ImportState, form: FormData): Promise<ImportState> {
  const user = await adminUser();
  if (!user) return { ok: false, message: "找不到頁面。" };
  const upload = form.get("csv");
  let text: string | null = null;
  if (upload instanceof File && upload.size > 0) {
    if (upload.size > 2_000_000) return { ok: false, message: "CSV 超過 2MB。" };
    text = await upload.text();
  } else {
    text = readBundledSkuCsv();
  }
  if (!text) return { ok: false, message: "找不到商品表。" };
  const result = importSkuCsv(getDb(), text);
  if (result.failed.length > 0) {
    return {
      ok: false,
      message: `有 ${result.failed.length} 列沒有匯入。已新增 ${result.created}、更新 ${result.updated}。`,
      failures: result.failed.slice(0, 20),
    };
  }
  refresh();
  redirect(`/purchases/skus?notice=sku_imported&created=${result.created}&updated=${result.updated}&excluded=${result.excluded.length}`);
}
