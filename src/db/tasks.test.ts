import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openAppDatabase } from "./index";
import { acceptTask, changeStatus, countInbox, dispatchTask, fulfillOrder, listInbox, listOrders, listSummaryOrders } from "./orders";
import { addProductOption, setProductOptionActive } from "./products";
import { insertDemoData } from "./seed-data";
import { sumRows, summarize } from "@/lib/summary";

let uploadDir = "";

beforeEach(() => {
  uploadDir = path.join(os.tmpdir(), `daigou-${crypto.randomUUID()}`);
  vi.stubEnv("UPLOAD_DIR", uploadDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function demoDb() {
  const db = openAppDatabase(":memory:");
  insertDemoData(db);
  return db;
}

describe("dispatched tasks", () => {
  it("keeps old demo orders out of the inbox and out of the unpaid totals", () => {
    const db = demoDb();
    const rows = summarize(listSummaryOrders(db));
    const all = sumRows(rows);
    expect(all.goodsOwed).toEqual({ JPY: 1620, TWD: 890 });
    expect(all.goodsPaid).toEqual({ JPY: 12280, TWD: 1450 });
    expect(countInbox(db, "user_mei")).toBe(1);
    expect(countInbox(db, "user_ken")).toBe(0);
    const pending = listInbox(db, "user_mei")[0];
    expect(pending?.productName).toBe("丸久小山園");
    expect(pending?.orderAmount).toBeNull();
    expect(listOrders(db, { id: "user_ken", role: "helper" }, { month: null }).some((order) => order.id === "order_mei_task")).toBe(false);
    const shipped = listOrders(db, { id: "user_wendy", role: "admin" }, { month: "2026-10", task: "shipped" });
    expect(shipped.some((order) => order.id === "order_ken_bottles")).toBe(true);
    expect(shipped.some((order) => order.id === "order_mei_task")).toBe(false);
  });

  it("lets only the assigned helper accept and then report an amount", () => {
    const db = demoDb();
    const created = dispatchTask(db, "user_wendy", {
      helperId: "user_mei",
      productOptionId: "product_marukyu",
      productName: "丸久小山園",
      productLinks: "https://example.com/tea",
      purchaseNote: "一罐",
      dispatchedOn: "2026-10-16",
      deliveryMethod: "handoff",
      deliveryAddress: null,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(listSummaryOrders(db).some((row) => row.orderAmount === 0)).toBe(false);
    expect(listInbox(db, "user_ken").some((order) => order.id === created.id)).toBe(false);
    expect(listInbox(db, "user_mei").some((order) => order.id === created.id)).toBe(true);

    expect(fulfillOrder(db, { id: "user_mei", role: "helper" }, created.id, {
      productOptionId: "product_marukyu",
      productName: "丸久小山園",
      orderAmount: 3200,
      orderCurrency: "JPY",
      orderDate: "2026-10-16",
      carrier: null,
      trackingNumber: null,
      shipDate: null,
      shippingCost: null,
      shippingCurrency: null,
      notes: null,
    }, []).ok).toBe(false);

    expect(acceptTask(db, { id: "user_ken", role: "helper" }, created.id).ok).toBe(false);
    expect(acceptTask(db, { id: "user_mei", role: "helper" }, created.id).ok).toBe(true);

    const reported = fulfillOrder(db, { id: "user_mei", role: "helper" }, created.id, {
      productOptionId: "product_marukyu",
      productName: "丸久小山園",
      orderAmount: 3200,
      orderCurrency: "JPY",
      orderDate: "2026-10-16",
      carrier: null,
      trackingNumber: null,
      shipDate: null,
      shippingCost: null,
      shippingCurrency: null,
      notes: null,
    }, []);
    expect(reported.ok).toBe(true);
    const ordered = listOrders(db, { id: "user_mei", role: "helper" }, { task: "ordered", month: "2026-10" });
    expect(ordered.find((order) => order.id === created.id)?.orderAmount).toBe(3200);
    expect(summarize(listSummaryOrders(db)).filter((row) => row.month === "2026-10" && row.helperId === "user_mei").some((row) => row.goodsOwed.JPY === 1620 + 3200)).toBe(true);

    const shipped = fulfillOrder(db, { id: "user_mei", role: "helper" }, created.id, {
      productOptionId: "product_marukyu",
      productName: "丸久小山園",
      orderAmount: 3200,
      orderCurrency: "JPY",
      orderDate: "2026-10-16",
      carrier: "面交",
      trackingNumber: null,
      shipDate: "2026-10-17",
      shippingCost: null,
      shippingCurrency: null,
      notes: null,
    }, []);
    expect(shipped.ok).toBe(true);
    expect(listOrders(db, { id: "user_mei", role: "helper" }, { task: "shipped", month: null }).some((order) => order.id === created.id)).toBe(true);
  });

  it("blocks payment until an amount exists, and protects the product list", () => {
    const db = demoDb();
    const blocked = changeStatus(db, { id: "user_wendy", role: "admin" }, "order_mei_task", {
      paid: true,
      paidAt: "2026-10-16",
      paidAmount: 100,
      paidCurrency: "JPY",
      goodsReceived: false,
      shippingReimbursed: false,
    });
    expect(blocked).toEqual({ ok: false, code: "need_amount" });

    expect(addProductOption(db, { id: "user_mei", role: "helper" }, "新商品").ok).toBe(false);
    expect(setProductOptionActive(db, { id: "user_wendy", role: "admin" }, "product_marukyu", false)).toEqual({
      ok: false,
      code: "last_product",
    });
    const added = addProductOption(db, { id: "user_wendy", role: "admin" }, "虎屋");
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(setProductOptionActive(db, { id: "user_wendy", role: "admin" }, "product_marukyu", false).ok).toBe(true);
    expect(setProductOptionActive(db, { id: "user_wendy", role: "admin" }, added.option.id, false)).toEqual({
      ok: false,
      code: "last_product",
    });
  });
});
