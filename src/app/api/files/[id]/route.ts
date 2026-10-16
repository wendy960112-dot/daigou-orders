import { getDb } from "@/db";
import { getAttachment, getOrder } from "@/db/orders";
import { canViewOrder } from "@/lib/auth-policy";
import { getCurrentUser } from "@/lib/current-user";
import { readUpload } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("請先登入", { status: 401 });
  const { id } = await context.params;
  const db = getDb();
  const attachment = getAttachment(db, id);
  if (!attachment) return new Response("找不到檔案", { status: 404 });
  const order = getOrder(db, attachment.orderId);
  if (!order || !canViewOrder(user, order)) return new Response("找不到檔案", { status: 404 });
  const bytes = readUpload(id);
  if (!bytes) return new Response("找不到檔案", { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
