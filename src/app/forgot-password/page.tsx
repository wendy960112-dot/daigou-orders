import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth-frame";
import { Field } from "@/components/field";
import { inputClass, primaryButtonClass } from "@/components/styles";
import { AUTH_ERRORS, AUTH_NOTICES } from "@/lib/auth-messages";
import { smtpConfig } from "@/lib/smtp";

export const metadata: Metadata = { title: "忘記密碼" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const errorText = error ? AUTH_ERRORS[error] : undefined;
  const noticeText = notice ? AUTH_NOTICES[notice] : undefined;
  const mailOn = Boolean(smtpConfig());

  return (
    <AuthFrame title="忘記密碼">
      {errorText ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {errorText}
        </p>
      ) : null}
      {noticeText ? (
        <p className="rounded-xl bg-good-soft px-3 py-2 text-sm text-good" role="status">
          {noticeText}
        </p>
      ) : null}
      {mailOn ? (
        <>
          <p className="mt-4 text-sm leading-6 text-muted">填註冊時的信箱。如果有這個帳號，會寄出一次性重設連結。</p>
          <form action="/api/auth/password/forgot" method="post" className="mt-4 space-y-3">
            <Field label="電子郵件" required>
              <input name="email" type="email" required autoComplete="email" className={inputClass} />
            </Field>
            <button type="submit" className={`${primaryButtonClass} w-full`}>
              寄出重設信
            </button>
          </form>
        </>
      ) : (
        <p className="mt-4 text-sm leading-7 text-ink">
          這個網站現在沒有設定寄信。請用 LINE 請溫蒂在「幫手」頁按「產生重設連結」，她會把一次性連結或代碼傳給你。
        </p>
      )}
      <a href="/login" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-sea">
        回登入
      </a>
    </AuthFrame>
  );
}
