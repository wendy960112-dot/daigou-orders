"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { adminIssueReset } from "@/db/email-auth";
import { setUserRole } from "@/db/users";
import { getCurrentUser } from "@/lib/current-user";
import { resetUrl } from "@/lib/email";
import { isSafeId } from "@/lib/format";
import { sendPasswordResetEmail, smtpConfig } from "@/lib/smtp";

export async function updateHelperRole(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const targetId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!isSafeId(targetId) || (role !== "helper" && role !== "pending")) {
    redirect("/helpers?notice=not_found");
  }
  const result = setUserRole(getDb(), user, targetId, role);
  revalidatePath("/helpers");
  revalidatePath("/");
  redirect(`/helpers?notice=${result.ok ? "role" : result.code}`);
}

export async function issuePasswordReset(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const targetId = String(formData.get("userId") ?? "");
  const result = adminIssueReset(getDb(), user, targetId);
  if (!result.ok) redirect(`/helpers?notice=${result.code}`);

  let notice = "reset_link";
  if (smtpConfig()) {
    try {
      await sendPasswordResetEmail(result.email, resetUrl(result.token));
      notice = "email_sent";
    } catch (error) {
      console.error("password reset email failed", error instanceof Error ? error.message : "unknown");
      notice = "email_failed";
    }
  }
  revalidatePath("/helpers");
  redirect(`/helpers?notice=${notice}&resetToken=${encodeURIComponent(result.token)}&resetFor=${encodeURIComponent(targetId)}`);
}
