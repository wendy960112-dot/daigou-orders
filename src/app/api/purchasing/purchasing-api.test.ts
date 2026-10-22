import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb, resetDbCache } from "@/db";
import { getPurchase } from "@/db/purchases";
import { makeReceiptPng } from "@/lib/png";
import { middleware } from "@/middleware";
import { GET as listPurchasesByRef, POST } from "./purchases/route";
import { GET as searchSkus } from "./skus/route";

const token = "test-purchasing-token";
let dir = "";

beforeEach(() => {
  dir = path.join(os.tmpdir(), `daigou-api-${crypto.randomUUID()}`);
  fs.mkdirSync(dir, { recursive: true });
  vi.stubEnv("DATABASE_PATH", path.join(dir, "daigou.db"));
  vi.stubEnv("UPLOAD_DIR", path.join(dir, "uploads"));
  vi.stubEnv("PURCHASING_API_TOKEN", token);
  resetDbCache();
});

afterEach(() => {
  resetDbCache();
  vi.unstubAllEnvs();
  fs.rmSync(dir, { recursive: true, force: true });
});

function authed(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  return new Request(url, { ...init, headers });
}

describe("purchasing API", () => {
  it("stays hidden without a token and ignores session cookies", async () => {
    vi.stubEnv("PURCHASING_API_TOKEN", "   ");
    const missing = await searchSkus(new Request("http://localhost/api/purchasing/skus?q=和光"));
    expect(missing.status).toBe(404);

    vi.stubEnv("PURCHASING_API_TOKEN", token);
    const cookieOnly = await searchSkus(
      new Request("http://localhost/api/purchasing/skus?q=和光", { headers: { cookie: "daigou_session=helper-session" } }),
    );
    expect(cookieOnly.status).toBe(404);
    const wrong = await searchSkus(new Request("http://localhost/api/purchasing/skus", { headers: { authorization: "Bearer nope" } }));
    expect(wrong.status).toBe(404);

    const passed = middleware(new NextRequest("http://localhost/api/purchasing/skus"));
    expect(passed.headers.get("location")).toBeNull();
    const report = middleware(new NextRequest("http://localhost/api/purchases/report"));
    expect(report.headers.get("location")).toContain("/login");
  });

  it("searches SKUs, creates a purchase from JSON, and rejects the same email", async () => {
    const search = await searchSkus(authed("http://localhost/api/purchasing/skus?q=丸久小山園 和光"));
    expect(search.status).toBe(200);
    const body = (await search.json()) as { skus: { id: string; variant: string; code: string | null }[] };
    const variants = body.skus.map((sku) => sku.variant).sort();
    expect(variants).toEqual(["100g 袋", "40g 罐"]);
    expect(body.skus.every((sku) => sku.code == null)).toBe(true);
    const skuId = body.skus.find((sku) => sku.variant === "40g 罐")!.id;
    const png = makeReceiptPng({ heading: "ORDER", lines: ["WAKO"], accent: [20, 90, 70] });

    const created = await POST(
      authed("http://localhost/api/purchasing/purchases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purchasedOn: "2026-10-18",
          supplier: "丸久小山園官網",
          currency: "JPY",
          shippingFee: 100,
          otherFees: 0,
          notes: "確認信",
          sourceRef: "gmail-abc",
          sourceSubject: "ご注文ありがとうございます",
          lines: [{ skuId, quantity: 1, unitPrice: 1300 }],
          screenshots: [{ fileName: "mail.png", contentBase64: `data:image/png;base64,${png.toString("base64")}` }],
        }),
      }),
    );
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { id: string; total: number; currency: string };
    expect(createdBody).toMatchObject({ total: 1400, currency: "JPY" });

    const purchase = getPurchase(getDb(), { id: "api", role: "admin" }, createdBody.id);
    expect(purchase?.files).toHaveLength(1);
    expect(purchase?.audit[0]?.actorLabel).toBe("API");
    expect(purchase?.audit[0]?.summary).toContain("API 建立進貨");
    expect(getPurchase(getDb(), { id: "user_mei", role: "helper" }, createdBody.id)).toBeNull();

    const lookup = await listPurchasesByRef(authed("http://localhost/api/purchasing/purchases?source_ref=gmail-abc"));
    expect(lookup.status).toBe(200);
    const found = (await lookup.json()) as { purchases: { id: string; deletedAt: string | null }[] };
    expect(found.purchases.map((row) => row.id)).toEqual([createdBody.id]);

    const duplicate = await POST(
      authed("http://localhost/api/purchasing/purchases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purchasedOn: "2026-10-18",
          supplier: "丸久小山園官網",
          currency: "JPY",
          sourceRef: "gmail-abc",
          lines: [{ skuId, quantity: 1, unitPrice: 1300 }],
        }),
      }),
    );
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ purchaseId: createdBody.id });

    const missingRef = await listPurchasesByRef(authed("http://localhost/api/purchasing/purchases"));
    expect(missingRef.status).toBe(400);
  });

  it("accepts a multipart screenshot", async () => {
    const search = await searchSkus(authed("http://localhost/api/purchasing/skus?q=HJ004"));
    const body = (await search.json()) as { skus: { id: string; variant: string }[] };
    const skuId = body.skus.find((sku) => sku.variant === "30g罐")!.id;
    const png = makeReceiptPng({ heading: "ORDER", lines: ["HJ"], accent: [20, 90, 70] });
    const form = new FormData();
    form.set("purchasedOn", "2026-10-19");
    form.set("supplier", "樂天");
    form.set("currency", "JPY");
    form.set("shippingFee", "0");
    form.set("lines", JSON.stringify([{ skuId, quantity: 3, unitPrice: 380 }]));
    form.set("sourceRef", "gmail-multipart");
    form.append("screenshots", new File([png], "shot.png", { type: "image/png" }));

    const created = await POST(authed("http://localhost/api/purchasing/purchases", { method: "POST", body: form }));
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { id: string; total: number };
    expect(createdBody.total).toBe(1140);
    expect(getPurchase(getDb(), { id: "api", role: "admin" }, createdBody.id)?.files).toHaveLength(1);
  });
});
