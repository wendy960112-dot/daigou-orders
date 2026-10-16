import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openAppDatabase } from "./index";
import { changeStatus, createOrder, deleteAttachment, getOrder, listAttachments, listAudit, listOrders, listSummaryOrders } from "./orders";
import { insertDemoData } from "./seed-data";
import { setUserRole, upsertLineUser } from "./users";
import { readUpload } from "@/lib/uploads";
import { sumRows, summarize } from "@/lib/summary";

let uploadDir = "";

beforeEach(() => {
  uploadDir = path.join(os.tmpdir(), `daigou-${crypto.randomUUID()}`);
  vi.stubEnv("UPLOAD_DIR", uploadDir);
  expect(uploadDir).toContain("daigou-");
  vi.stubEnv("ADMIN_LINE_USER_IDS", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function demoDb() {
  const db = openAppDatabase(":memory:");
  insertDemoData(db);
  return db;
}

describe("demo orders", () => {
  it("totals owed and paid per helper and month without converting currency", () => {
    const db = demoDb();
    const rows = summarize(listSummaryOrders(db));
    const october = rows.filter((row) => row.month === "2026-10");
    const mei = october.find((row) => row.helperId === "user_mei");
    const ken = october.find((row) => row.helperId === "user_ken");
    expect(mei?.goodsOwed).toEqual({ JPY: 1620, TWD: 0 });
    expect(ken?.goodsOwed).toEqual({ JPY: 0, TWD: 890 });
    expect(ken?.goodsPaid).toEqual({ JPY: 0, TWD: 1450 });
    expect(ken?.shippingOwed.TWD).toBe(220);

    const all = sumRows(rows);
    expect(all.goodsOwed).toEqual({ JPY: 1620, TWD: 890 });
    expect(all.goodsPaid).toEqual({ JPY: 12280, TWD: 1450 });
    expect(all.shippingOwed).toEqual({ JPY: 0, TWD: 220 });
    expect(all.shippingPaid).toEqual({ JPY: 2050, TWD: 0 });
  });

  it("lets a helper create an order with a file, and keeps other helpers out", () => {
    const db = demoDb();
    const created = createOrder(
      db,
      "user_mei",
      {
        helperId: "user_mei",
        productName: "測試餅乾",
        productLinks: "https://example.com/cookie",
        quantity: 1,
        orderAmount: 500,
        orderCurrency: "JPY",
        orderDate: "2026-10-16",
        expectedArrivalDate: null,
        carrier: null,
        trackingNumber: null,
        shipDate: null,
        shippingCost: 300,
        shippingCurrency: "JPY",
        notes: null,
      },
      [{ kind: "order_proof", fileName: "proof.png", mimeType: "image/png", buffer: Buffer.from("png-bytes") }],
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const mei = listOrders(db, { id: "user_mei", role: "helper" }, { month: "2026-10" });
    const ken = listOrders(db, { id: "user_ken", role: "helper" }, { month: "2026-10" });
    expect(mei.some((order) => order.id === created.id)).toBe(true);
    expect(ken.some((order) => order.id === created.id)).toBe(false);

    const attachmentId = listAttachments(db, created.id)[0]?.id;
    expect(attachmentId).toBeTruthy();
    const stored = readUpload(attachmentId!);
    expect(stored?.equals(Buffer.from("png-bytes"))).toBe(true);

    const removed = deleteAttachment(db, { id: "user_ken", role: "helper" }, attachmentId!);
    expect(removed.ok).toBe(false);
    const gone = deleteAttachment(db, { id: "user_mei", role: "helper" }, attachmentId!);
    expect(gone.ok).toBe(true);
    expect(readUpload(attachmentId!)).toBeNull();
  });

  it("records who changed a status and blocks helpers from doing it", () => {
    const db = demoDb();
    expect(changeStatus(db, { id: "user_mei", role: "helper" }, "order_mei_oct", {
      paid: true,
      paidAt: "2026-10-16",
      paidAmount: 1620,
      paidCurrency: "JPY",
      goodsReceived: false,
      shippingReimbursed: false,
    }).ok).toBe(false);

    const updated = changeStatus(db, { id: "user_wendy", role: "admin" }, "order_mei_oct", {
      paid: true,
      paidAt: "2026-10-16",
      paidAmount: 1620,
      paidCurrency: "JPY",
      goodsReceived: true,
      shippingReimbursed: false,
    });
    expect(updated).toEqual({ ok: true, code: "status" });
    const order = getOrder(db, "order_mei_oct");
    expect(order?.paid).toBe(true);
    expect(order?.goodsReceived).toBe(true);
    const audit = listAudit(db, "order_mei_oct").map((entry) => entry.summary);
    expect(audit.some((line) => line.includes("勾選已匯款") && line.includes("¥1,620"))).toBe(true);
    expect(audit.some((line) => line.includes("勾選已收到貨"))).toBe(true);

    const blocked = changeStatus(db, { id: "user_wendy", role: "admin" }, "order_mei_oct", {
      paid: true,
      paidAt: "2026-10-16",
      paidAmount: 1620,
      paidCurrency: "JPY",
      goodsReceived: true,
      shippingReimbursed: true,
    });
    expect(blocked).toEqual({ ok: false, code: "need_shipping" });
  });
});

describe("line users", () => {
  it("makes the first LINE login an admin and holds everyone else for approval", () => {
    const db = openAppDatabase(":memory:");
    const wendy = upsertLineUser(db, { lineUserId: "Uwendy", displayName: "溫蒂", pictureUrl: null });
    const mei = upsertLineUser(db, { lineUserId: "Umei", displayName: "小美", pictureUrl: null });
    expect(wendy.role).toBe("admin");
    expect(mei.role).toBe("pending");

    vi.stubEnv("ADMIN_LINE_USER_IDS", "Umei");
    const promoted = upsertLineUser(db, { lineUserId: "Umei", displayName: "小美", pictureUrl: null });
    expect(promoted.role).toBe("admin");

    expect(setUserRole(db, wendy, wendy.id, "helper")).toEqual({ ok: false, code: "self" });
    const approved = setUserRole(db, { id: wendy.id, role: "admin" }, mei.id, "helper");
    expect(approved).toEqual({ ok: true });
  });
});
