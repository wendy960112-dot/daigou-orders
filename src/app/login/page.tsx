import { redirect } from "next/navigation";
import { Field } from "@/components/field";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/styles";
import { devLoginAllowed } from "@/lib/auth-policy";
import { AUTH_ERRORS, AUTH_NOTICES } from "@/lib/auth-messages";
import { getCurrentUser } from "@/lib/current-user";
import { DEMO_USERS } from "@/lib/demo-users";
import { lineConfigured } from "@/lib/line";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "pending" ? "/pending" : "/");

  const { error, notice } = await searchParams;
  const showDevLogin = devLoginAllowed();
  const lineReady = lineConfigured();
  const errorText = error ? AUTH_ERRORS[error] : undefined;
  const noticeText = notice ? AUTH_NOTICES[notice] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid size-14 place-items-center rounded-3xl bg-brand text-xl font-bold text-white">代</div>
        <div>
          <p className="text-sm text-muted">日本代購</p>
          <h1 className="text-3xl font-bold">代購單</h1>
        </div>
      </div>
      <p className="text-base leading-7 text-ink">小幫手下單、溫蒂記匯款、運費照收據報銷。日圓和新台幣分開算，不會自動換匯。</p>

      <ol className="mt-5 space-y-2 text-sm leading-6 text-muted">
        <li>1. 小幫手貼上商品連結，上傳訂單截圖。</li>
        <li>2. 溫蒂匯款後勾選「已匯款」，收到轉寄包裹後勾選「已收到貨」。</li>
        <li>3. 運費用收據金額報銷，勾選「運費已報銷」。</li>
      </ol>

      {errorText ? (
        <p className="mt-5 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {errorText}
        </p>
      ) : null}
      {noticeText ? (
        <p className="mt-5 rounded-xl bg-good-soft px-3 py-2 text-sm text-good" role="status">
          {noticeText}
        </p>
      ) : null}

      <div className="mt-6">
        {lineReady ? (
          <a href="/api/auth/line" className={`${primaryButtonClass} w-full`}>
            使用 LINE 登入
          </a>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-card px-4 py-3 text-sm leading-6 text-muted">
            LINE 登入還沒設定。設定完成後，這裡會出現「使用 LINE 登入」。
          </div>
        )}
      </div>

      <section className="mt-6 rounded-3xl border border-line bg-card p-4">
        <h2 className="text-base font-semibold">用電子郵件登入</h2>
        <p className="mt-1 text-sm leading-6 text-muted">沒有 LINE 也可以註冊。新帳號要等溫蒂核准。</p>
        <form action="/api/auth/email/login" method="post" className="mt-4 space-y-3">
          <Field label="電子郵件" required>
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </Field>
          <Field label="密碼" required>
            <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
          </Field>
          <button type="submit" className={`${primaryButtonClass} w-full`}>
            登入
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-x-4">
          <a href="/signup" className="inline-flex min-h-11 items-center text-sm font-medium text-brand">
            註冊新帳號
          </a>
          <a href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-medium text-sea">
            忘記密碼
          </a>
        </div>
      </section>

      {showDevLogin ? (
        <section className="mt-8 rounded-3xl border border-line bg-card p-4">
          <h2 className="text-base font-semibold">試用登入</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            只在你自己電腦的開發模式出現。正式網站會強制關閉，就算環境變數設成 true 也不會開。
          </p>
          <div className="mt-4 space-y-2">
            {DEMO_USERS.map((demo) => (
              <form key={demo.id} action="/api/auth/dev" method="post">
                <input type="hidden" name="userId" value={demo.id} />
                <button type="submit" className={`${secondaryButtonClass} w-full justify-between`}>
                  <span>以{demo.displayName}身份進入</span>
                  <span className="text-muted">{demo.blurb}</span>
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
