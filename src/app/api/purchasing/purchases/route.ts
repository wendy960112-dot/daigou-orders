import { getDb } from "@/db";
import { createPurchase, findPurchasesBySourceRef } from "@/db/purchases";
import { parsePurchaseDraft } from "@/lib/purchase-input";
import { purchasingDenied } from "@/lib/purchasing-auth";
import { fileFromBuffer } from "@/lib/uploads";

export const runtime = "nodejs";

function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return Response.json({ error, ...extra }, { status });
}

async function screenshotsFromJson(value: unknown) {
  if (value == null) return { ok: true as const, files: [] as { fileName: string; mimeType: string; buffer: Buffer }[] };
  if (!Array.isArray(value)) return { ok: false as const, message: "截圖格式不對" };
  if (value.length > 8) return { ok: false as const, message: "訂單截圖最多 8 個。" };
  const files = [];
  for (const item of value) {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const fileName = typeof row.fileName === "string" ? row.fileName : "screenshot";
    const raw = typeof row.contentBase64 === "string" ? row.contentBase64 : "";
    const base64 = raw.replace(/^data:[^;]+;base64,/, "");
    if (!base64) continue;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      return { ok: false as const, message: "截圖不是有效的 base64" };
    }
    const parsed = fileFromBuffer(fileName, buffer);
    if (!parsed.ok) return parsed;
    files.push(parsed.file);
  }
  return { ok: true as const, files };
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

export async function GET(request: Request) {
  const denied = purchasingDenied(request);
  if (denied) return denied;
  const sourceRef = new URL(request.url).searchParams.get("source_ref")?.trim() ?? "";
  if (!sourceRef) return jsonError(400, "請提供 source_ref");
  return Response.json({ purchases: findPurchasesBySourceRef(getDb(), sourceRef) });
}

export async function POST(request: Request) {
  const denied = purchasingDenied(request);
  if (denied) return denied;
  const contentType = request.headers.get("content-type") ?? "";
  let draftInput: Record<string, unknown>;
  let files: { fileName: string; mimeType: string; buffer: Buffer }[] = [];
  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "JSON 格式不對");
    }
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    draftInput = record;
    const screenshots = await screenshotsFromJson(record.screenshots);
    if (!screenshots.ok) return jsonError(400, screenshots.message);
    files = screenshots.files;
  } else if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    let lines: unknown = [];
    try {
      lines = JSON.parse(String(form.get("lines") ?? "[]"));
    } catch {
      return jsonError(400, "lines 要是 JSON 陣列");
    }
    draftInput = {
      purchasedOn: form.get("purchasedOn"),
      supplier: form.get("supplier"),
      currency: form.get("currency"),
      orderId: form.get("orderId"),
      shippingFee: form.get("shippingFee"),
      otherFees: form.get("otherFees"),
      notes: form.get("notes"),
      sourceRef: form.get("sourceRef"),
      sourceSubject: form.get("sourceSubject"),
      lines,
    };
    const screenshots = await screenshotsFromForm(form);
    if (!screenshots.ok) return jsonError(400, screenshots.message);
    files = screenshots.files;
  } else {
    return jsonError(400, "請用 JSON 或 multipart");
  }

  const parsed = parsePurchaseDraft(draftInput);
  if (!parsed.ok) return jsonError(400, parsed.message);
  const created = createPurchase(getDb(), { kind: "api" }, parsed.data, files);
  if (!created.ok) {
    if (created.code === "duplicate") {
      const existing = parsed.data.sourceRef ? findPurchasesBySourceRef(getDb(), parsed.data.sourceRef).find((row) => !row.deletedAt) : null;
      return jsonError(409, created.message, { purchaseId: existing?.id ?? null });
    }
    return jsonError(400, created.message);
  }
  return Response.json({ id: created.id, total: created.total, currency: created.currency }, { status: 201 });
}
