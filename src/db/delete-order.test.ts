import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openAppDatabase } from "./index";
import { countInbox, listAttachments, listAudit, listOrders, listSummaryOrders, restoreOrder, softDeleteOrder } from "./orders";
import { insertDemoData } from "./seed-data";
import { sumRows, summarize } from "@/lib/summary";
import { canViewOrder } from "@/lib/auth-policy";

let uploadDir = "";

beforeEach(() => {
  uploadDir = path.join(os.tmpdir(), `daigou-${crypto.randomUUID()}`);
  vi.stubEnv("UPLOAD_DIR", uploadDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("soft delete", () => {
  it("hides a task from lists, summaries, and the helper, then restores it with the files intact", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    const before = sumRows(summarize(listSummaryOrders(db)));

    expect(softDeleteOrder(db, { id: "user_mei", role: "helper" }, "order_mei_oct")).toEqual({ ok: false, code: "forbidden" });
    const removed = softDeleteOrder(db, { id: "user_wendy", role: "admin" }, "order_mei_oct");
    expect(removed).toEqual({ ok: true, code: "deleted_order" });

    expect(listOrders(db, { id: "user_wendy", role: "admin" }, { month: "2026-10" }).some((order) => order.id === "order_mei_oct")).toBe(false);
    expect(listOrders(db, { id: "user_mei", role: "helper" }, { month: null }).some((order) => order.id === "order_mei_oct")).toBe(false);
    expect(listOrders(db, { id: "user_mei", role: "helper" }, { month: null, includeDeleted: true })).toEqual([]);
    expect(canViewOrder({ id: "user_mei", role: "helper" }, { helperId: "user_mei", deletedAt: "2026-10-16T00:00:00.000Z" })).toBe(false);

    const after = sumRows(summarize(listSummaryOrders(db)));
    expect(before.goodsOwed.JPY - after.goodsOwed.JPY).toBe(1620);
    expect(listAttachments(db, "order_mei_oct").length).toBe(0);

    const audit = listAudit(db, "order_mei_oct").map((entry) => entry.summary);
    expect(audit[0]).toBe("刪除任務：白色戀人 24入");

    const hidden = listOrders(db, { id: "user_wendy", role: "admin" }, { month: null, includeDeleted: true });
    expect(hidden.map((order) => order.id)).toContain("order_mei_oct");

    expect(restoreOrder(db, { id: "user_ken", role: "helper" }, "order_mei_oct")).toEqual({ ok: false, code: "forbidden" });
    expect(restoreOrder(db, { id: "user_wendy", role: "admin" }, "order_mei_oct").ok).toBe(true);
    expect(listOrders(db, { id: "user_mei", role: "helper" }, { month: "2026-10" }).some((order) => order.id === "order_mei_oct")).toBe(true);
    expect(sumRows(summarize(listSummaryOrders(db))).goodsOwed.JPY).toBe(before.goodsOwed.JPY);
    expect(listAudit(db, "order_mei_oct")[0]?.summary).toBe("還原任務：白色戀人 24入");
  });

  it("records a paid warning in the audit and drops the task from the inbox", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    expect(countInbox(db, "user_mei")).toBe(1);
    const removed = softDeleteOrder(db, { id: "user_wendy", role: "admin" }, "order_mei_sep");
    expect(removed.ok).toBe(true);
    expect(listAudit(db, "order_mei_sep")[0]?.summary).toBe("刪除任務：無印良品 聚丙烯收納盒（已匯款、運費已報銷）");
    expect(listAttachments(db, "order_mei_sep").length).toBeGreaterThan(0);
    expect(sumRows(summarize(listSummaryOrders(db))).goodsPaid.JPY).toBe(12280 - 2480);

    expect(softDeleteOrder(db, { id: "user_wendy", role: "admin" }, "order_mei_task").ok).toBe(true);
    expect(countInbox(db, "user_mei")).toBe(0);
  });
});
