import fs from "fs";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PurchaseDraft } from "@/lib/purchase-input";
import { makeReceiptPng } from "@/lib/png";
import { readUpload } from "@/lib/uploads";
import { openAppDatabase } from "./index";
import { createPurchase, getPurchase, listPurchases, reportToCsv, restorePurchase, skuSpendReport, softDeletePurchase, updatePurchase } from "./purchases";
import { insertDemoData } from "./seed-data";
import { getSku, importSkuCsv, listSkus, saveSku, setSkuArchived } from "./skus";
import { skus } from "./schema";

const csv = fs.readFileSync(path.join(process.cwd(), "data", "rakuten-products.csv"), "utf8");
const admin = { kind: "user" as const, id: "user_wendy", role: "admin" as const, label: "溫蒂" };
const helper = { kind: "user" as const, id: "user_mei", role: "helper" as const, label: "小美" };

let uploadDir = "";

beforeEach(() => {
  uploadDir = path.join(os.tmpdir(), `daigou-purchases-${crypto.randomUUID()}`);
  vi.stubEnv("UPLOAD_DIR", uploadDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function draft(skuId: string, overrides: Partial<PurchaseDraft> = {}): PurchaseDraft {
  return {
    purchasedOn: "2026-10-18",
    supplier: "丸久小山園官網",
    currency: "JPY" as const,
    orderId: null,
    shippingFee: 220,
    otherFees: 0,
    notes: "官網",
    sourceRef: null,
    sourceSubject: null,
    lines: [{ skuId, quantity: 2, unitPrice: 1620 }],
    ...overrides,
  };
}

describe("sku import", () => {
  it("imports the bundled sheet once, keeps a hand-entered code, and stays archived", () => {
    const db = openAppDatabase(":memory:");
    const first = importSkuCsv(db, csv);
    expect(first.failed).toEqual([]);
    expect(first.created).toBe(283);
    expect(first.excluded).toHaveLength(1);
    const again = importSkuCsv(db, csv);
    expect(again.created).toBe(0);
    expect(again.updated).toBe(283);
    expect(listSkus(db, helper)).toEqual([]);
    expect(saveSku(db, admin, null, { code: "MP004", name: "不該建立", variant: "", category: null, subcategory: null, salePrice: 1, cost: 1 }).ok).toBe(false);

    const wako = db.select().from(skus).where(eq(skus.name, "丸久小山園 和光")).all();
    expect(wako.map((sku) => sku.variant).sort()).toEqual(["100g 袋", "40g 罐"]);
    const tin = wako.find((sku) => sku.variant === "40g 罐");
    expect(tin?.code).toBeNull();
    expect(saveSku(db, admin, tin!.id, { code: "WAKO", name: tin!.name, variant: tin!.variant, category: tin!.category, subcategory: tin!.subcategory, salePrice: 1, cost: 0 }).ok).toBe(true);
    setSkuArchived(db, admin, tin!.id, true);
    importSkuCsv(db, csv);
    const kept = getSku(db, admin, tin!.id);
    expect(kept?.code).toBe("WAKO");
    expect(kept?.salePrice).toBe(1300);
    expect(kept?.archivedAt).toBeTruthy();
    expect(getSku(db, helper, tin!.id)).toBeNull();
    expect(setSkuArchived(db, helper, tin!.id, false).ok).toBe(false);
  });
});

describe("purchases", () => {
  it("records a purchase, hides it from a helper, and splits the spend report by currency", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    importSkuCsv(db, csv);
    const sku = db.select().from(skus).where(eq(skus.code, "HJ004")).all().find((row) => row.variant === "30g罐");
    expect(sku).toBeTruthy();
    const png = makeReceiptPng({ heading: "ORDER", lines: ["MATCHA"], accent: [20, 90, 70] });

    expect(createPurchase(db, helper, draft(sku!.id), []).ok).toBe(false);
    const created = createPurchase(db, admin, draft(sku!.id, { sourceRef: "gmail-1", sourceSubject: "ご注文" }), [
      { fileName: "order.png", mimeType: "image/png", buffer: png },
    ]);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.total).toBe(2 * 1620 + 220);

    const purchase = getPurchase(db, admin, created.id);
    expect(purchase?.files).toHaveLength(1);
    expect(purchase?.audit[0]?.actorLabel).toBe("溫蒂");
    expect(purchase?.audit[0]?.summary).toContain("建立進貨");
    expect(readUpload(purchase!.files[0]!.id)?.equals(png)).toBe(true);
    expect(getPurchase(db, helper, created.id)).toBeNull();
    expect(listPurchases(db, helper, {})).toEqual([]);
    expect(listPurchases(db, admin, { q: "中煎" }).map((row) => row.id)).toEqual([created.id]);

    const twd = createPurchase(db, admin, draft(sku!.id, { currency: "TWD", shippingFee: 0, lines: [{ skuId: sku!.id, quantity: 1, unitPrice: 380 }] }), []);
    expect(twd.ok).toBe(true);
    const report = skuSpendReport(db, admin, {});
    const yen = report.find((row) => row.skuId === sku!.id && row.currency === "JPY");
    const nt = report.find((row) => row.skuId === sku!.id && row.currency === "TWD");
    expect(Number(yen?.quantity)).toBe(2);
    expect(Number(yen?.spend)).toBe(3240);
    expect(Number(nt?.quantity)).toBe(1);
    expect(Number(nt?.spend)).toBe(380);
    expect(skuSpendReport(db, helper, {})).toEqual([]);
    expect(reportToCsv(report).startsWith("\uFEFF商品編號,商品名稱")).toBe(true);

    expect(softDeletePurchase(db, helper, created.id).ok).toBe(false);
    expect(softDeletePurchase(db, { kind: "api" }, created.id).ok).toBe(false);
    expect(softDeletePurchase(db, admin, created.id).ok).toBe(true);
    expect(listPurchases(db, admin, {}).some((row) => row.id === created.id)).toBe(false);
    expect(skuSpendReport(db, admin, {}).some((row) => row.currency === "JPY" && row.skuId === sku!.id)).toBe(false);
    expect(readUpload(purchase!.files[0]!.id)).toBeTruthy();
    expect(listPurchases(db, admin, { includeDeleted: true }).some((row) => row.id === created.id)).toBe(true);
    expect(restorePurchase(db, helper, created.id).ok).toBe(false);
    expect(restorePurchase(db, admin, created.id).ok).toBe(true);
    expect(listPurchases(db, admin, {}).some((row) => row.id === created.id)).toBe(true);
    expect(getPurchase(db, admin, created.id)?.audit[0]?.summary).toContain("還原進貨");
  });

  it("blocks a second live purchase for the same email and allows it after delete", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    const saved = saveSku(db, admin, null, { code: null, name: "手打", variant: "", category: null, subcategory: null, salePrice: 0, cost: 0 });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const first = createPurchase(db, { kind: "api" }, draft(saved.id, { sourceRef: "gmail-9" }), []);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const duplicate = createPurchase(db, { kind: "api" }, draft(saved.id, { sourceRef: "gmail-9" }), []);
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.message).toContain("已經建過");
    expect(duplicate.code).toBe("duplicate");
    expect(getPurchase(db, admin, first.id)?.audit[0]?.actorLabel).toBe("API");
    expect(getPurchase(db, admin, first.id)?.audit[0]?.summary).toContain("API 建立進貨");
    softDeletePurchase(db, admin, first.id);
    const again = createPurchase(db, admin, draft(saved.id, { sourceRef: "gmail-9" }), []);
    expect(again.ok).toBe(true);
    const changed = updatePurchase(db, admin, first.id, draft(saved.id, { supplier: "樂天", sourceRef: null }), [], []);
    expect(changed.ok).toBe(false);
  });
});
