import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { registerEmailUser } from "@/db/email-auth";
import { normalizeDisplayName, normalizeEmail } from "@/lib/email";
import { hashPassword, passwordError } from "@/lib/password";
import { setSession } from "@/lib/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const displayName = normalizeDisplayName(String(form.get("displayName") ?? ""));
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (!email) redirect("/signup?error=invalid_email");
  if (!displayName) redirect("/signup?error=invalid_name");
  if (passwordError(password)) redirect("/signup?error=weak_password");
  if (password !== confirm) redirect("/signup?error=mismatch");

  const created = registerEmailUser(getDb(), { email, displayName, passwordHash: hashPassword(password) });
  if (!created.ok) redirect(`/signup?error=${created.code}`);
  await setSession(created.user.id);
  redirect(created.user.role === "pending" ? "/pending" : "/");
}
