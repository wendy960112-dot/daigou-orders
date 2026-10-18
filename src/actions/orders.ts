"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  acceptTask as acceptTaskRow,
  addAttachments,
  adminEditOrder,
  changeStatus,
  countKind,
  deleteAttachment,
  dispatchTask as insertTask,
  fulfillOrder,
  getOrder,
  listAttachments,
  restoreOrder as restoreOrderRow,
  softDeleteOrder,
} from "@/db/orders";
import { getProductOption } from "@/db/products";
import { listHelpers } from "@/db/users";
import { canViewOrder } from "@/lib/auth-policy";
import { getCurrentUser } from "@/lib/current-user";
import { isSafeId } from "@/lib/format";
import { NOTICES } from "@/lib/notices";
import type { ActionState, AttachmentKind } from "@/lib/types";
import { filesFromForm, MAX_FILES_PER_KIND, orderProofMessage } from "@/lib/uploads";
import { parseAdminEditForm, parseDispatchForm, parseFulfillForm, parsePaidFields } from "@/lib/validators";

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
  const proofError = orderProofMessage(countKind(existingFiles, "order_proof"), proofs.files.length);
  if (proofError) return { ok: false, message: proofError };
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

export async function updateStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const orderId = String(formData.get("orderId") ?? "");
  if (!isSafeId(orderId)) redirect("/?notice=not_found");

  const db = getDb();
  const order = getOrder(db, orderId);
  if (!order || !canViewOrder(user, order)) redirect("/?notice=not_found");
  if (user.role !== "admin") return { ok: false, message: "只有管理員可以改狀態。" };

  const parsed = parsePaidFields(formData);
  if (!parsed.ok) return parsed;

  const payments = await filesFromForm(formData, "paymentProofs", "payment_proof");
  if (!payments.ok) return payments;
  const reimbursements = await filesFromForm(formData, "reimbursementProofs", "reimbursement_proof");
  if (!reimbursements.ok) return reimbursements;
  const existingFiles = listAttachments(db, orderId);
  if (countKind(existingFiles, "payment_proof") + payments.files.length > MAX_FILES_PER_KIND) {
    return { ok: false, message: "匯款截圖最多 8 個。" };
  }
  if (countKind(existingFiles, "reimbursement_proof") + reimbursements.files.length > MAX_FILES_PER_KIND) {
    return { ok: false, message: "運費報銷截圖最多 8 個。" };
  }

  const result = changeStatus(db, user, orderId, parsed.data);
  if (!result.ok) return { ok: false, message: NOTICES[result.code] ?? "沒有更新。" };

  const files = [...payments.files, ...reimbursements.files];
  if (files.length > 0) {
    const added = addAttachments(db, user, orderId, files);
    if (!added.ok) return { ok: false, message: added.message };
  }

  refresh(orderId);
  const notice = files.length > 0 && result.code === "status_same" ? "proofs" : result.code;
  redirect(`/orders/${orderId}?notice=${notice}`);
}

export async function saveAdminEdit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "請先登入。" };
  if (user.role !== "admin") return { ok: false, message: "只有管理員可以代填。" };

  const orderId = String(formData.get("orderId") ?? "");
  if (!isSafeId(orderId)) return { ok: false, message: "找不到訂單。" };

  const parsed = parseAdminEditForm(formData);
  if (!parsed.ok) return parsed;
  const paid = parsePaidFields(formData);
  if (!paid.ok) return paid;

  const db = getDb();
  const existing = getOrder(db, orderId);
  if (!existing) return { ok: false, message: "找不到訂單。" };
  if (existing.deletedAt) return { ok: false, message: "這張任務已刪除，請先還原。" };

  const helper = listHelpers(db).find((item) => item.id === parsed.data.helperId);
  if (!helper) return { ok: false, message: "請選擇已核准的小幫手。" };

  const option = getProductOption(db, parsed.data.task.productOptionId);
  const keepingCurrent = option?.id === existing.productOptionId || option?.name === existing.productName;
  if (!option || (!option.active && !keepingCurrent)) return { ok: false, message: "請選擇商品名稱。" };

  const orderProofs = await filesFromForm(formData, "orderProofs", "order_proof");
  if (!orderProofs.ok) return orderProofs;
  const receipts = await filesFromForm(formData, "shippingReceipts", "shipping_receipt");
  if (!receipts.ok) return receipts;
  const payments = await filesFromForm(formData, "paymentProofs", "payment_proof");
  if (!payments.ok) return payments;
  const reimbursements = await filesFromForm(formData, "reimbursementProofs", "reimbursement_proof");
  if (!reimbursements.ok) return reimbursements;

  const removeIds = formData
    .getAll("removeFile")
    .filter((value): value is string => typeof value === "string" && isSafeId(value));
  const existingFiles = listAttachments(db, orderId);
  const kept = (kind: AttachmentKind) => existingFiles.filter((file) => file.kind === kind && !removeIds.includes(file.id)).length;

  if (parsed.data.saveReport) {
    const proofError = orderProofMessage(kept("order_proof"), orderProofs.files.length);
    if (proofError) return { ok: false, message: proofError };
  } else if (kept("order_proof") + orderProofs.files.length > MAX_FILES_PER_KIND) {
    return { ok: false, message: "訂單截圖最多 8 個。" };
  }
  if (kept("shipping_receipt") + receipts.files.length > MAX_FILES_PER_KIND) {
    return { ok: false, message: "運費收據最多 8 個。" };
  }
  if (kept("payment_proof") + payments.files.length > MAX_FILES_PER_KIND) {
    return { ok: false, message: "匯款截圖最多 8 個。" };
  }
  if (kept("reimbursement_proof") + reimbursements.files.length > MAX_FILES_PER_KIND) {
    return { ok: false, message: "運費報銷截圖最多 8 個。" };
  }

  const result = adminEditOrder(
    db,
    user,
    orderId,
    {
      helperId: helper.id,
      helperName: helper.displayName,
      productOptionId: option.id,
      productName: option.name,
      productLinks: parsed.data.task.productLinks,
      purchaseNote: parsed.data.task.purchaseNote,
      dispatchedOn: parsed.data.task.dispatchedOn,
      deliveryMethod: parsed.data.task.deliveryMethod,
      deliveryAddress: parsed.data.task.deliveryAddress,
      saveReport: parsed.data.saveReport,
      markAccepted: parsed.data.markAccepted,
      report: parsed.data.report,
      ...paid.data,
    },
    [...orderProofs.files, ...receipts.files, ...payments.files, ...reimbursements.files],
    removeIds,
  );
  if (!result.ok) return { ok: false, message: result.message };
  refresh(orderId);
  revalidatePath(`/orders/${orderId}/edit`);
  redirect(`/orders/${orderId}?notice=proxy_saved`);
}

export async function removeOrder(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const orderId = String(formData.get("orderId") ?? "");
  const result = softDeleteOrder(getDb(), user, orderId);
  if (!result.ok) redirect(isSafeId(orderId) ? `/orders/${orderId}?notice=${result.code}` : `/?notice=${result.code}`);
  refresh(orderId);
  redirect(`/orders/deleted?notice=${result.code}`);
}

export async function restoreOrder(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const orderId = String(formData.get("orderId") ?? "");
  const result = restoreOrderRow(getDb(), user, orderId);
  if (!result.ok) redirect(isSafeId(orderId) ? `/orders/${orderId}?notice=${result.code}` : `/?notice=${result.code}`);
  refresh(orderId);
  redirect(`/orders/${orderId}?notice=${result.code}`);
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
