import { redirect } from "next/navigation";
import { devLoginAllowed } from "@/lib/auth-policy";
import { getCurrentUser } from "@/lib/current-user";
import { DEMO_USERS } from "@/lib/demo-users";
import { lineConfigured } from "@/lib/line";
import { primaryButtonClass, secondaryButtonClass } from "@/components/styles";

const ERRORS: Record<string, string> = {
  line_denied: "你取消了 LINE 登入。",
  line_state: "登入驗證已過期，請再試一次。",
  line_failed: "LINE 登入沒有成功，請稍後再試。",
  line_config: "還沒設定 LINE 頻道。可以先用下面的試用登入，或照說明書設定。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "pending" ? "/pending" : "/");

  const { error } = await searchParams;
  const showDevLogin = devLoginAllowed();
  const lineReady = lineConfigured();

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

      {error && ERRORS[error] ? (
        <p className="mt-5 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {ERRORS[error]}
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
