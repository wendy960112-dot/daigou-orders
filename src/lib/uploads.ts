import fs from "fs";
import path from "path";
import { isSafeId } from "./format";
import type { AttachmentKind } from "./types";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_FIELD = 6;
export const MAX_FILES_PER_KIND = 8;

export type IncomingFile = {
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

export function uploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");
}

export function uploadPath(id: string) {
  if (!isSafeId(id)) throw new Error("附件編號不正確");
  const root = path.resolve(uploadDir());
  const full = path.resolve(root, id);
  if (full !== path.join(root, id)) throw new Error("附件路徑不正確");
  return full;
}

export function writeUpload(id: string, buffer: Buffer) {
  const dir = uploadDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(uploadPath(id), buffer);
}

export function readUpload(id: string) {
  try {
    return fs.readFileSync(uploadPath(id));
  } catch {
    return null;
  }
}

export function removeUpload(id: string) {
  if (!isSafeId(id)) return;
  fs.rmSync(uploadPath(id), { force: true });
}

export function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "image";
  const cleaned = base.replace(/[^\w.\-\u3400-\u9fff]+/g, "_").slice(0, 80);
  return cleaned || "image";
}

export function sniffMime(buffer: Buffer): IncomingFile["mimeType"] | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

export function orderProofMessage(existing: number, incoming: number) {
  const total = existing + incoming;
  if (total < 1) return "請上傳訂單截圖。";
  if (total > MAX_FILES_PER_KIND) return "訂單截圖最多 8 個。";
  return null;
}

export async function filesFromForm(
  form: FormData,
  field: string,
  kind: AttachmentKind,
): Promise<{ ok: true; files: IncomingFile[] } | { ok: false; message: string }> {
  const values = form.getAll(field).filter((value): value is File => value instanceof File && value.size > 0);
  if (values.length > MAX_FILES_PER_FIELD) {
    return { ok: false, message: "一次最多上傳 6 個檔案" };
  }

  const files: IncomingFile[] = [];
  for (const file of values) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false, message: `${file.name || "檔案"} 超過 5MB，請縮小後再傳` };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = sniffMime(buffer);
    if (!mimeType) {
      return { ok: false, message: "只能上傳 JPG、PNG、WEBP 圖片或 PDF" };
    }
    files.push({ kind, fileName: safeFileName(file.name || "upload"), mimeType, buffer });
  }
  return { ok: true, files };
}
