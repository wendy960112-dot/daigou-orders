import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { resetPreviewOrders } from "@/db/orders";
import { getSessionContext } from "@/lib/current-user";

export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (ctx.user.role !== "admin") redirect("/");
  resetPreviewOrders(getDb());
  revalidatePath("/");
  revalidatePath("/summary");
  redirect("/?notice=preview_reset");
}
