import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasProxy } from "@/lib/proxy";
import { openAppDatabase } from "./index";
import { adminEditOrder, countInbox, fulfillOrder, getOrder, listAttachments, listAudit, listOrders, softDeleteOrder, type AdminEditInput } from "./orders";
import { insertDemoData } from "./seed-data";

let uploadDir = "";

beforeEach(() => {
  uploadDir = path.join(os.tmpdir(), `daigou-${crypto.randomUUID()}`);
  vi.stubEnv("UPLOAD_DIR", uploadDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const admin = { id: "user_wendy", role: "admin" as const };
const mei = { id: "user_mei", role: "helper" as const };

function taskInput(overrides: Partial<AdminEditInput> = {}): AdminEditInput {
  return {
    helperId: "user_mei",
    helperName: "小美",
    productOptionId: "product_marukyu",
    productName: "丸久小山園",
    productLinks: "https://www.marukyu-koyamaen.co.jp/",
    purchaseNote: "請買特撰抹茶 100g 兩罐，選罐裝。這是示範任務，連結不是真的下單頁。",
    dispatchedOn: "2026-10-16",
    deliveryMethod: "ship_address",
    deliveryAddress: "台北市大安區示範路 1 號",
    saveReport: false,
    markAccepted: false,
    report: null,
    paid: false,
    paidAt: null,
    paidAmount: null,
    paidCurrency: null,
    goodsReceived: false,
    shippingReimbursed: false,
    ...overrides,
  };
}

function report(overrides: Partial<NonNullable<AdminEditInput["report"]>> = {}): NonNullable<AdminEditInput["report"]> {
  return {
    orderAmount: 5400,
    orderCurrency: "JPY",
    orderDate: "2026-10-18",
    carrier: "EMS",
    trackingNumber: null,
    shipDate: null,
    shippingCost: null,
    shippingCurrency: null,
    notes: "LINE 傳來的",
    ...overrides,
  };
}

const screenshot = { kind: "order_proof" as const, fileName: "訂單.png", mimeType: "image/png", buffer: Buffer.from("png") };

describe("admin edits a task for the helper", () => {
  it("refuses helpers and shows an edited note only to the assigned helper", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    const note = "LINE：改成三罐";
    expect(adminEditOrder(db, mei, "order_mei_task", taskInput({ purchaseNote: note }), [], []).ok).toBe(false);

    const saved = adminEditOrder(db, admin, "order_mei_task", taskInput({ purchaseNote: note }), [], []);
    expect(saved).toEqual({ ok: true });
    const order = getOrder(db, "order_mei_task");
    expect(order?.purchaseNote).toBe(note);
    expect(order?.taskStatus).toBe("pending");
    expect(hasProxy(order?.proxyFields, "purchaseNote")).toBe(true);
    expect(listOrders(db, mei, { month: null }).some((row) => row.purchaseNote === note)).toBe(true);
    expect(listOrders(db, { id: "user_ken", role: "helper" }, { month: null }).some((row) => row.id === "order_mei_task")).toBe(false);
  });

  it("requires an order screenshot to mark the purchase complete, then records the proxy fill", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    const missing = adminEditOrder(db, admin, "order_mei_task", taskInput({ saveReport: true, report: report() }), [], []);
    expect(missing).toEqual({ ok: false, message: "請上傳訂單截圖。" });

    const saved = adminEditOrder(db, admin, "order_mei_task", taskInput({ saveReport: true, report: report() }), [screenshot], []);
    expect(saved).toEqual({ ok: true });
    const order = getOrder(db, "order_mei_task");
    expect(order?.taskStatus).toBe("ordered");
    expect(order?.orderAmount).toBe(5400);
    expect(order?.carrier).toBe("EMS");
    expect(hasProxy(order?.proxyFields, "orderAmount")).toBe(true);
    expect(hasProxy(order?.proxyFields, "orderProof")).toBe(true);
    expect(listAudit(db, "order_mei_task").some((entry) => entry.summary.includes("由管理員代填") && entry.actorId === "user_wendy")).toBe(true);
    expect(listOrders(db, mei, { task: "ordered", month: "2026-10" }).some((row) => row.id === "order_mei_task")).toBe(true);
  });

  it("marks the task shipped when a tracking number is filled in", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    const saved = adminEditOrder(
      db,
      admin,
      "order_mei_task",
      taskInput({ saveReport: true, report: report({ trackingNumber: "EE123456789JP" }) }),
      [screenshot],
      [],
    );
    expect(saved).toEqual({ ok: true });
    expect(getOrder(db, "order_mei_task")?.taskStatus).toBe("shipped");
  });

  it("moves the inbox when the helper is reassigned", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    expect(countInbox(db, "user_mei")).toBe(1);
    const saved = adminEditOrder(db, admin, "order_mei_task", taskInput({ helperId: "user_ken", helperName: "阿健" }), [], []);
    expect(saved).toEqual({ ok: true });
    expect(countInbox(db, "user_mei")).toBe(0);
    expect(countInbox(db, "user_ken")).toBe(1);
    expect(listOrders(db, { id: "user_ken", role: "helper" }, { task: "pending", month: null }).some((row) => row.id === "order_mei_task")).toBe(true);
    expect(listAudit(db, "order_mei_task").some((entry) => entry.summary.includes("改派給阿健"))).toBe(true);
  });

  it("refuses a deleted task and lets a later helper report clear the proxy mark", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    expect(softDeleteOrder(db, admin, "order_mei_task").ok).toBe(true);
    expect(adminEditOrder(db, admin, "order_mei_task", taskInput({ purchaseNote: "不行" }), [], [])).toEqual({
      ok: false,
      message: "這張任務已刪除，請先還原。",
    });

    const filled = adminEditOrder(db, admin, "order_mei_oct", taskInput({
      productName: "白色戀人 24入",
      productLinks: "https://example.com/demo/shiroi-koibito",
      purchaseNote: "店家尚未出貨。這是示範訂單。",
      dispatchedOn: "2026-10-03",
      deliveryMethod: "handoff",
      deliveryAddress: null,
      saveReport: true,
      report: report({ orderAmount: 1800, orderDate: "2026-10-03", notes: "代填備註" }),
    }), [screenshot], []);
    expect(filled).toEqual({ ok: true });
    expect(hasProxy(getOrder(db, "order_mei_oct")?.proxyFields, "orderAmount")).toBe(true);

    const reported = fulfillOrder(db, mei, "order_mei_oct", {
      productOptionId: "product_marukyu",
      productName: "白色戀人 24入",
      orderAmount: 1700,
      orderCurrency: "JPY",
      orderDate: "2026-10-03",
      carrier: "EMS",
      trackingNumber: null,
      shipDate: null,
      shippingCost: null,
      shippingCurrency: null,
      notes: "代填備註",
    }, []);
    expect(reported).toEqual({ ok: true });
    expect(hasProxy(getOrder(db, "order_mei_oct")?.proxyFields, "orderAmount")).toBe(false);
  });

  it("replaces a transfer screenshot from the same edit", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    const first = { kind: "payment_proof" as const, fileName: "匯款-舊.png", mimeType: "image/png", buffer: Buffer.from("old") };
    expect(adminEditOrder(db, admin, "order_mei_oct", taskInput({
      productName: "白色戀人 24入",
      productLinks: "https://example.com/demo/shiroi-koibito",
      purchaseNote: "店家尚未出貨。這是示範訂單。",
      dispatchedOn: "2026-10-03",
      deliveryMethod: "handoff",
      deliveryAddress: null,
    }), [first], []).ok).toBe(true);
    const oldId = listAttachments(db, "order_mei_oct").find((file) => file.kind === "payment_proof")?.id;
    expect(oldId).toBeTruthy();
    const next = { kind: "payment_proof" as const, fileName: "匯款-新.png", mimeType: "image/png", buffer: Buffer.from("new") };
    expect(adminEditOrder(db, admin, "order_mei_oct", taskInput({
      productName: "白色戀人 24入",
      productLinks: "https://example.com/demo/shiroi-koibito",
      purchaseNote: "店家尚未出貨。這是示範訂單。",
      dispatchedOn: "2026-10-03",
      deliveryMethod: "handoff",
      deliveryAddress: null,
    }), [next], [oldId!]).ok).toBe(true);
    const payments = listAttachments(db, "order_mei_oct").filter((file) => file.kind === "payment_proof");
    expect(payments.map((file) => file.fileName)).toEqual(["匯款-新.png"]);
    expect(listAudit(db, "order_mei_oct").some((entry) => entry.summary.includes("刪除了附件"))).toBe(true);
  });
});
