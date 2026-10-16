import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openAppDatabase } from "./index";
import { addAttachments, deleteAttachment, listAttachments, listAudit } from "./orders";
import { insertDemoData } from "./seed-data";

let uploadDir = "";

beforeEach(() => {
  uploadDir = path.join(os.tmpdir(), `daigou-${crypto.randomUUID()}`);
  vi.stubEnv("UPLOAD_DIR", uploadDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("payment proofs", () => {
  it("lets only the admin upload and delete transfer screenshots, and writes an audit line", () => {
    const db = openAppDatabase(":memory:");
    insertDemoData(db);
    const file = { kind: "payment_proof" as const, fileName: "匯款.png", mimeType: "image/png", buffer: Buffer.from("pay") };
    const shipping = {
      kind: "reimbursement_proof" as const,
      fileName: "報銷.png",
      mimeType: "image/png",
      buffer: Buffer.from("ship"),
    };

    expect(addAttachments(db, { id: "user_mei", role: "helper" }, "order_mei_oct", [file]).ok).toBe(false);
    const added = addAttachments(db, { id: "user_wendy", role: "admin" }, "order_mei_oct", [file, shipping]);
    expect(added.ok).toBe(true);

    const rows = listAttachments(db, "order_mei_oct");
    const payment = rows.find((row) => row.kind === "payment_proof");
    const reimbursement = rows.find((row) => row.kind === "reimbursement_proof");
    expect(payment?.fileName).toBe("匯款.png");
    expect(reimbursement?.fileName).toBe("報銷.png");

    const summaries = listAudit(db, "order_mei_oct").map((entry) => entry.summary);
    expect(summaries).toContain("上傳匯款截圖：匯款.png");
    expect(summaries).toContain("上傳運費報銷截圖：報銷.png");

    expect(deleteAttachment(db, { id: "user_ken", role: "helper" }, payment!.id)).toEqual({ ok: false, code: "forbidden" });
    expect(deleteAttachment(db, { id: "user_mei", role: "helper" }, payment!.id)).toEqual({ ok: false, code: "forbidden" });
    expect(deleteAttachment(db, { id: "user_wendy", role: "admin" }, reimbursement!.id).ok).toBe(true);
    expect(listAttachments(db, "order_mei_oct").some((row) => row.kind === "reimbursement_proof")).toBe(false);
    expect(listAttachments(db, "order_mei_oct").some((row) => row.kind === "payment_proof")).toBe(true);
  });
});
