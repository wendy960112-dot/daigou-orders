import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth-frame";
import { Field } from "@/components/field";
import { inputClass, primaryButtonClass } from "@/components/styles";
import { AUTH_ERRORS } from "@/lib/auth-messages";

export const metadata: Metadata = { title: "重設密碼" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = one(params.token) ?? "";
  const token = /^[A-Za-z0-9_-]{20,128}$/.test(raw) ? raw : "";
  const error = one(params.error);
  const errorText = error ? AUTH_ERRORS[error] : undefined;

  return (
    <AuthFrame title="重設密碼">
      <p className="text-sm leading-6 text-muted">設定新密碼。這個連結或代碼只能用一次，一個小時後失效。</p>
      {errorText ? (
        <p className="mt-4 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {errorText}
        </p>
      ) : null}
      <form action="/api/auth/password/reset" method="post" className="mt-4 space-y-3">
        {token ? (
          <input type="hidden" name="token" value={token} />
        ) : (
          <Field label="重設代碼" required hint="貼上溫蒂傳給你的代碼或連結裡 token= 後面的文字。">
            <input name="token" required autoComplete="one-time-code" className={inputClass} defaultValue={raw} />
          </Field>
        )}
        <Field label="新密碼" required hint="至少 8 個字。">
          <input name="password" type="password" required autoComplete="new-password" minLength={8} className={inputClass} />
        </Field>
        <Field label="再輸入一次" required>
          <input name="confirm" type="password" required autoComplete="new-password" minLength={8} className={inputClass} />
        </Field>
        <button type="submit" className={`${primaryButtonClass} w-full`}>
          更新密碼
        </button>
      </form>
    </AuthFrame>
  );
}
