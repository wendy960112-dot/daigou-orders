"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { setUserRole } from "@/db/users";
import { getCurrentUser } from "@/lib/current-user";
import { isSafeId } from "@/lib/format";

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
