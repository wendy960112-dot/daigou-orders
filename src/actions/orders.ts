"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  acceptTask as acceptTaskRow,
  changeStatus,
  countKind,
  deleteAttachment,
  dispatchTask as insertTask,
  fulfillOrder,
  getOrder,
  listAttachments,
} from "@/db/orders";
import { getProductOption } from "@/db/products";
import { listHelpers } from "@/db/users";
import { canViewOrder } from "@/lib/auth-policy";
import { getCurrentUser } from "@/lib/current-user";
import { isSafeId } from "@/lib/format";
import type { ActionState } from "@/lib/types";
import { filesFromForm, MAX_FILES_PER_KIND } from "@/lib/uploads";
import { parseDispatchForm, parseFulfillForm, parsePaidFields } from "@/lib/validators";

function refresh(orderId?: string) {
  revalidatePath("/");
  revalidatePath("/inbox");
  revalidatePath("/summary");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

export async function dispatchTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "請先登入。" };
  if (user.role !== "admin") return { ok: false, message: "只有管理員可以發任務。" };
  const parsed = parseDispatchForm(formData);
  if (!parsed.ok) return parsed;
  const db = getDb();
  const helperId = String(formData.get("helperId") ?? "");
  if (!listHelpers(db).some((helper) => helper.id === helperId)) return { ok: false, message: "請選擇已核准的小幫手。" };
  const option = getProductOption(db, parsed.data.productOptionId);
  if (!option || !option.active) return { ok: false, message: "請選擇商品名稱。" };
  const created = insertTask(db, user.id, { ...parsed.data, helperId, productName: option.name });
  if (!created.ok) return { ok: false, message: created.message };
  refresh(created.id);
  redirect(`/orders/${created.id}?notice=dispatched`);
}

export async function acceptTask(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const orderId = String(formData.get("orderId") ?? "");
  const result = acceptTaskRow(getDb(), user, orderId);
  if (!result.ok) redirect(isSafeId(orderId) ? `/orders/${orderId}?notice=${result.code}` : `/?notice=${result.code}`);
  refresh(orderId);
  redirect(`/orders/${orderId}?notice=accepted`);
}

export async function saveOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role === "pending") return { ok: false, message: "請先登入。" };
  if (user.role !== "helper") return { ok: false, message: "請由小幫手回報下單內容。" };

  const parsed = parseFulfillForm(formData);
  if (!parsed.ok) return parsed;
  const orderId = String(formData.get("orderId") ?? "");
  if (!isSafeId(orderId)) return { ok: false, message: "找不到訂單。" };

  const db = getDb();
  const existing = getOrder(db, orderId);
  if (!existing || existing.helperId !== user.id) return { ok: false, message: "找不到訂單。" };

  const option = getProductOption(db, parsed.data.productOptionId);
  const keepingCurrent = option?.name === existing.productName || option?.id === existing.productOptionId;
  if (!option || (!option.active && !keepingCurrent)) return { ok: false, message: "請選擇商品名稱。" };

  const proofs = await filesFromForm(formData, "orderProofs", "order_proof");
  if (!proofs.ok) return proofs;
  const receipts = await filesFromForm(formData, "shippingReceipts", "shipping_receipt");
  if (!receipts.ok) return receipts;
  const existingFiles = listAttachments(db, orderId);
  if (countKind(existingFiles, "order_proof") + proofs.files.length > MAX_FILES_PER_KIND) {
    return { ok: false, message: "訂單截圖最多 8 個。" };
  }
  if (countKind(existingFiles, "shipping_receipt") + receipts.files.length > MAX_FILES_PER_KIND) {
    return { ok: false, message: "運費收據最多 8 個。" };
  }

  const result = fulfillOrder(
    db,
    user,
    orderId,
    { ...parsed.data, productOptionId: option.id, productName: option.name },
    [...proofs.files, ...receipts.files],
  );
  if (!result.ok) return { ok: false, message: result.message };
  refresh(orderId);
  redirect(`/orders/${orderId}?notice=saved`);
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
