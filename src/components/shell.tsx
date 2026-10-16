import { roleLabel } from "@/lib/auth-policy";
import type { User } from "@/db/schema";
import { BottomNav } from "./bottom-nav";
import { PreviewBanner } from "./preview-banner";

export function Shell({
  user,
  previewing = false,
  children,
}: {
  user: User;
  previewing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="sticky top-0 z-30">
        {previewing ? <PreviewBanner /> : null}
        <header className="border-b border-line bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-brand text-base font-bold text-white">代</div>
              <div>
                <p className="text-xs text-muted">日本代購</p>
                <p className="text-lg font-bold leading-5">代購單</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-right">
              {user.pictureUrl ? (
                <img src={user.pictureUrl} alt="" className="size-9 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="grid size-9 place-items-center rounded-full bg-sea-soft text-sm font-semibold text-sea">
                  {user.displayName.slice(0, 1)}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold leading-5">{user.displayName}</p>
                <div className="flex items-center justify-end gap-2">
                  <p className="text-xs text-muted">{roleLabel(user.role)}</p>
                  <form action="/api/auth/logout" method="post">
                    <button className="text-xs font-medium text-brand" type="submit">
                      登出
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </header>
        {user.role === "admin" && !previewing ? (
          <form action="/api/preview/enter" method="post" className="border-b border-line bg-brand-soft">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
              <p className="text-sm leading-5 text-ink">想確認小幫手看到的畫面</p>
              <button className="shrink-0 text-sm font-semibold text-brand" type="submit">
                小幫手視角
              </button>
            </div>
          </form>
        ) : null}
      </div>
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">{children}</main>
      <BottomNav role={user.role} />
    </>
  );
}
