import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { Field } from "@/components/field";
import { inputClass, primaryButtonClass } from "@/components/styles";
import { AUTH_ERRORS } from "@/lib/auth-messages";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "註冊" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "pending" ? "/pending" : "/");
  const { error } = await searchParams;
  const errorText = error ? AUTH_ERRORS[error] : undefined;

  return (
    <AuthFrame title="註冊">
      <p className="text-sm leading-6 text-muted">註冊後會先停在待核准。溫蒂核准之後才能建立訂單。</p>
      {errorText ? (
        <p className="mt-4 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {errorText}
        </p>
      ) : null}
      <form action="/api/auth/email/signup" method="post" className="mt-4 space-y-3">
        <Field label="顯示名稱" required hint="溫蒂會看到這個名字。">
          <input name="displayName" required autoComplete="nickname" className={inputClass} placeholder="小美" />
        </Field>
        <Field label="電子郵件" required>
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
        <Field label="密碼" required hint="至少 8 個字。">
          <input name="password" type="password" required autoComplete="new-password" minLength={8} className={inputClass} />
        </Field>
        <Field label="再輸入一次密碼" required>
          <input name="confirm" type="password" required autoComplete="new-password" minLength={8} className={inputClass} />
        </Field>
        <button type="submit" className={`${primaryButtonClass} w-full`}>
          註冊
        </button>
      </form>
      <a href="/login" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-sea">
        已經有帳號，去登入
      </a>
    </AuthFrame>
  );
}
