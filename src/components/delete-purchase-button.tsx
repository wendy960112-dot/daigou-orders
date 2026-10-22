"use client";

import { useEffect, useId, useState } from "react";
import { removePurchase } from "@/actions/purchases";

export function DeletePurchaseButton({ purchaseId, supplier }: { purchaseId: string; supplier: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-warn/40 bg-warn-soft px-4 text-sm font-semibold text-warn"
      >
        刪除
      </button>
      {open ? (
        <div className="fixed inset-0 z-30 grid place-items-end bg-ink/40 p-4 sm:place-items-center" role="presentation" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-3xl bg-card p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="text-lg font-bold">
              刪除這張進貨？
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {supplier} 會從進貨列表和累計買入消失。截圖先留著，之後可以還原。
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line bg-white text-sm font-medium">
                取消
              </button>
              <form action={removePurchase} className="flex-1">
                <input type="hidden" name="purchaseId" value={purchaseId} />
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-warn px-4 text-sm font-semibold text-white">
                  刪除
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
