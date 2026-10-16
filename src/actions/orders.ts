"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  changeStatus,
  countKind,
  createOrder,
  deleteAttachment,
  getOrder,
  listAttachments,
  updateOrder,
} from "@/db/orders";
import { listHelpers } from "@/db/users";
import { canEditOrder, canViewOrder } from "@/lib/auth-policy";
import { getCurrentUser } from "@/lib/current-user";
import { isSafeId } from "@/lib/format";
import type { ActionState } from "@/lib/types";
import { filesFromForm, MAX_FILES_PER_KIND } from "@/lib/uploads";
import { parseOrderForm, parsePaidFields } from "@/lib/validators";

function refresh(orderId?: string) {
  revalidatePath("/");
  revalidatePath("/summary");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

export async function saveOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role === "pending") return { ok: false, message: "請先登入。" };

  const parsed = parseOrderForm(formData);
  if (!parsed.ok) return parsed;

  const orderIdRaw = formData.get("orderId");
  const orderId = typeof orderIdRaw === "string" && orderIdRaw ? orderIdRaw : null;
  if (orderId && !isSafeId(orderId)) return { ok: false, message: "找不到訂單。" };

  const db = getDb();
  let helperId = user.id;
  if (orderId) {
    const existing = getOrder(db, orderId);
    if (!existing || !canEditOrder(user, existing)) return { ok: false, message: "找不到訂單。" };
    helperId = existing.helperId;
  } else if (user.role === "admin") {
    const requested = String(formData.get("helperId") ?? "");
    if (!listHelpers(db).some((helper) => helper.id === requested)) {
      return { ok: false, message: "請選擇小幫手。" };
    }
    helperId = requested;
  }

  const proofs = await filesFromForm(formData, "orderProofs", "order_proof");
  if (!proofs.ok) return proofs;
  const receipts = await filesFromForm(formData, "shippingReceipts", "shipping_receipt");
  if (!receipts.ok) return receipts;

  if (orderId) {
    const existingFiles = listAttachments(db, orderId);
    if (countKind(existingFiles, "order_proof") + proofs.files.length > MAX_FILES_PER_KIND) {
      return { ok: false, message: "訂單截圖最多 8 個。" };
    }
    if (countKind(existingFiles, "shipping_receipt") + receipts.files.length > MAX_FILES_PER_KIND) {
      return { ok: false, message: "運費收據最多 8 個。" };
    }
  }

  const input = { ...parsed.data, helperId };
  const files = [...proofs.files, ...receipts.files];
  if (orderId) {
    const result = updateOrder(db, user.id, orderId, input, files);
    if (!result.ok) return { ok: false, message: result.message };
    refresh(orderId);
    redirect(`/orders/${orderId}?notice=saved`);
  }

  const created = createOrder(db, user.id, input, files);
  if (!created.ok) return { ok: false, message: created.message };
  refresh(created.id);
  redirect(`/orders/${created.id}?notice=saved`);
}

export async function updateStatus(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const orderId = String(formData.get("orderId") ?? "");
  if (!isSafeId(orderId)) redirect("/?notice=not_found");

  const db = getDb();
  const order = getOrder(db, orderId);
  if (!order || !canViewOrder(user, order)) redirect("/?notice=not_found");

  const parsed = parsePaidFields(formData);
  if (!parsed.ok) redirect(`/orders/${orderId}?notice=invalid`);

  const result = changeStatus(db, user, orderId, parsed.data);
  refresh(orderId);
  redirect(`/orders/${orderId}?notice=${result.ok ? result.code : result.code}`);
}

export async function removeAttachment(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const attachmentId = String(formData.get("attachmentId") ?? "");
  const result = deleteAttachment(getDb(), user, attachmentId);
  if (!result.ok) redirect(`/?notice=${result.code}`);
  refresh(result.orderId);
  redirect(`/orders/${result.orderId}?notice=deleted`);
}
