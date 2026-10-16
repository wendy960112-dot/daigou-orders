"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { addProductOption, renameProductOption, setProductOptionActive } from "@/db/products";
import { getCurrentUser } from "@/lib/current-user";
import { isSafeId } from "@/lib/format";

function refreshProducts() {
  revalidatePath("/settings");
  revalidatePath("/orders/new");
}

export async function addProduct(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const result = addProductOption(getDb(), user, String(formData.get("name") ?? ""));
  refreshProducts();
  redirect(`/settings?notice=${result.ok ? "product_saved" : result.code}`);
}

export async function renameProduct(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  if (!isSafeId(id)) redirect("/settings?notice=not_found");
  const result = renameProductOption(getDb(), user, id, String(formData.get("name") ?? ""));
  refreshProducts();
  redirect(`/settings?notice=${result.ok ? "product_saved" : result.code}`);
}

export async function toggleProduct(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  if (!isSafeId(id)) redirect("/settings?notice=not_found");
  const active = formData.get("active") === "1";
  const result = setProductOptionActive(getDb(), user, id, active);
  refreshProducts();
  redirect(`/settings?notice=${result.ok ? "product_saved" : result.code}`);
}
