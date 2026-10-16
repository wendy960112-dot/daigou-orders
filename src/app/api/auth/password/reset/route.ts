import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { resetPasswordWithToken } from "@/db/email-auth";
import { hashPassword, passwordError } from "@/lib/password";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const back = `/reset-password?token=${encodeURIComponent(token)}`;
  if (passwordError(password)) redirect(`${back}&error=weak_password`);
  if (password !== confirm) redirect(`${back}&error=mismatch`);
  const result = resetPasswordWithToken(getDb(), token, hashPassword(password));
  if (!result.ok) redirect(`${back}&error=reset_invalid`);
  redirect("/login?notice=password_reset");
}
