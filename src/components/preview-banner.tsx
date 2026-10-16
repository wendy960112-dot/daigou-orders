import { ResetPreviewButton } from "./reset-preview-button";

export function PreviewBanner() {
  return (
    <div className="border-b border-warn/30 bg-warn-soft" role="status">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-warn">小幫手視角</p>
          <p className="mt-1 text-sm leading-6 text-ink">
            你正在預覽小幫手看到的畫面。這些訂單屬於「預覽小幫手」，不會出現在正式列表，也不會計入彙總。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action="/api/preview/exit" method="post">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-3 text-sm font-semibold text-white"
              type="submit"
            >
              回到管理員
            </button>
          </form>
          <ResetPreviewButton />
        </div>
      </div>
    </div>
  );
}
