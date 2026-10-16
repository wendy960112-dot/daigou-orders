import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { getUserById } from "@/db/users";
import { devLoginAllowed } from "@/lib/auth-policy";
import { isDemoUserId } from "@/lib/demo-users";
import { setSession } from "@/lib/session";

export async function POST(request: Request) {
  if (!devLoginAllowed()) {
    return new Response("開發用登入已停用", { status: 404 });
  }
  const form = await request.formData();
  const userId = String(form.get("userId") ?? "");
  if (!isDemoUserId(userId)) return new Response("未知的試用帳號", { status: 400 });
  const user = getUserById(getDb(), userId);
  if (!user) return new Response("找不到試用帳號，請重新啟動開發伺服器。", { status: 400 });
  await setSession(user.id);
  redirect(user.role === "pending" ? "/pending" : "/");
}
