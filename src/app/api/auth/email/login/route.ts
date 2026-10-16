import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { authenticateEmail } from "@/db/email-auth";
import { setSession } from "@/lib/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = authenticateEmail(getDb(), String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!result.ok) redirect(`/login?error=${result.code}`);
  await setSession(result.user.id);
  redirect(result.user.role === "pending" ? "/pending" : "/");
}
