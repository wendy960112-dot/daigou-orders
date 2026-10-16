"use client";

export function ResetPreviewButton() {
  return (
    <form
      action="/api/preview/reset"
      method="post"
      onSubmit={(event) => {
        if (!window.confirm("要清空預覽小幫手的訂單嗎？正式訂單不會被刪。")) {
          event.preventDefault();
        }
      }}
    >
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-warn/40 bg-white px-3 text-sm font-medium text-warn"
        type="submit"
      >
        清空預覽訂單
      </button>
    </form>
  );
}
