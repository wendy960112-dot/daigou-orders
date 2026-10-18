import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isShippedReport, resolveTaskStatus } from "@/lib/tasks";
import { migrate } from "./migrate";
import { openAppDatabase } from "./index";
import { acceptTask, createOrder, fulfillOrder, getOrder, listOrders } from "./orders";
import { orders } from "./schema";
import { insertDemoData } from "./seed-data";

let uploadDir = "";

beforeEach(() => {
  uploadDir = path.join(os.tmpdir(), `daigou-${crypto.randomUUID()}`);
  vi.stubEnv("UPLOAD_DIR", uploadDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const report = {
  productOptionId: "product_marukyu",
  productName: "丸久小山園",
  orderAmount: 3200,
  orderCurrency: "JPY" as const,
  orderDate: "2026-10-18",
  shippingCost: null,
  shippingCurrency: null,
  notes: null,
};

describe("shipped status ignores carrier", () => {
  it("stays ordered when the report only has EMS, and ships once tracking or a ship date exists", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    expect(acceptTask(db, { id: "user_mei", role: "helper" }, "order_mei_task").ok).toBe(true);

    const emsOnly = fulfillOrder(
      db,
      { id: "user_mei", role: "helper" },
      "order_mei_task",
      { ...report, carrier: "EMS", trackingNumber: null, shipDate: null },
      [],
    );
    expect(emsOnly.ok).toBe(true);
    expect(getOrder(db, "order_mei_task")?.taskStatus).toBe("ordered");
    expect(listOrders(db, { id: "user_mei", role: "helper" }, { task: "ordered", month: null }).some((row) => row.id === "order_mei_task")).toBe(true);
    expect(listOrders(db, { id: "user_mei", role: "helper" }, { task: "shipped", month: null }).some((row) => row.id === "order_mei_task")).toBe(false);

    const tracked = fulfillOrder(
      db,
      { id: "user_mei", role: "helper" },
      "order_mei_task",
      { ...report, carrier: "EMS", trackingNumber: "EE123456789JP", shipDate: null },
      [],
    );
    expect(tracked.ok).toBe(true);
    expect(getOrder(db, "order_mei_task")?.taskStatus).toBe("shipped");

    const dated = fulfillOrder(
      db,
      { id: "user_mei", role: "helper" },
      "order_mei_task",
      { ...report, carrier: "EMS", trackingNumber: null, shipDate: "2026-10-19" },
      [],
    );
    expect(dated.ok).toBe(true);
    expect(getOrder(db, "order_mei_task")?.taskStatus).toBe("shipped");
  });

  it("does not mark a newly created order shipped just because the carrier is EMS", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
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
        orderDate: "2026-10-18",
        expectedArrivalDate: null,
        carrier: "EMS",
        trackingNumber: null,
        shipDate: null,
        shippingCost: null,
        shippingCurrency: null,
        notes: null,
      },
      [],
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(getOrder(db, created.id)?.taskStatus).toBe("ordered");
    expect(resolveTaskStatus({ taskStatus: null, shipDate: null, trackingNumber: "  ", carrier: "EMS" })).toBe("ordered");
    expect(isShippedReport({ shipDate: "2026-10-19", trackingNumber: null })).toBe(true);
  });

  it("repairs shipped rows that have neither a tracking number nor a ship date", () => {
    const file = path.join(uploadDir, "repair.db");
    const db = openAppDatabase(file);
    insertDemoData(db);
    db.update(orders)
      .set({ taskStatus: "shipped", carrier: "EMS", trackingNumber: "  ", shipDate: null })
      .where(eq(orders.id, "order_mei_oct"))
      .run();
    db.update(orders)
      .set({
        taskStatus: "shipped",
        carrier: "EMS",
        trackingNumber: null,
        shipDate: "",
        deletedAt: "2026-10-18T00:00:00.000Z",
      })
      .where(eq(orders.id, "order_ken_mario"))
      .run();

    db.$client.prepare("DELETE FROM _migrations WHERE id = ?").run("0007_repair_shipped.sql");
    migrate(db.$client);

    expect(getOrder(db, "order_mei_oct")?.taskStatus).toBe("ordered");
    expect(getOrder(db, "order_ken_bottles")?.taskStatus).toBe("shipped");
    expect(getOrder(db, "order_mei_sep")?.taskStatus).toBe("shipped");
    expect(getOrder(db, "order_ken_mario")?.taskStatus).toBe("shipped");

    db.$client.prepare("DELETE FROM _migrations WHERE id = ?").run("0007_repair_shipped.sql");
    migrate(db.$client);
    expect(getOrder(db, "order_mei_oct")?.taskStatus).toBe("ordered");
    expect(getOrder(db, "order_ken_bottles")?.taskStatus).toBe("shipped");
  });
});
