import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { countRecentFailures, getUserByEmail, issueResetToken, recordLoginFailure } from "@/db/email-auth";
import { normalizeEmail, resetUrl } from "@/lib/email";
import { sendPasswordResetEmail, smtpConfig } from "@/lib/smtp";

export async function POST(request: Request) {
  if (!smtpConfig()) redirect("/forgot-password?error=smtp_off");
  const form = await request.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  if (email) {
    const key = `reset:${email}`;
    const db = getDb();
    if (countRecentFailures(db, key) < 3) {
      recordLoginFailure(db, key);
      const user = getUserByEmail(db, email);
      if (user?.email && user.passwordHash) {
        const issued = issueResetToken(db, user.id);
        if (issued) {
          try {
            await sendPasswordResetEmail(user.email, resetUrl(issued.token, new URL(request.url).origin));
          } catch (error) {
            console.error("password reset email failed", error instanceof Error ? error.message : "unknown");
          }
        }
      }
    }
  }
  redirect("/forgot-password?notice=reset_requested");
}
