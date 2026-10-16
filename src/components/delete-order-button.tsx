"use client";

import { useEffect, useId, useState } from "react";
import { removeOrder } from "@/actions/orders";
import { deletionWarning } from "@/lib/delete-order";
import { secondaryButtonClass } from "./styles";

export function DeleteOrderButton({
  orderId,
  productName,
  paid,
  shippingReimbursed,
}: {
  orderId: string;
  productName: string;
  paid: boolean;
  shippingReimbursed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const warning = deletionWarning({ productName, paid, shippingReimbursed });

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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-2xl bg-card p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className={`text-lg font-bold ${warning.strong ? "text-warn" : ""}`}>
              {warning.title}
            </h2>
            <p className="mt-2 text-sm leading-6">{warning.body}</p>
            {warning.strong ? (
              <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-sm leading-6 text-warn">
                已匯款或運費已報銷的單刪掉之後，彙總不會再算這筆。請確認不是點錯。
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)}>
                取消
              </button>
              <form action={removeOrder}>
                <input type="hidden" name="orderId" value={orderId} />
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-warn px-4 text-base font-semibold text-white"
                >
                  確定刪除
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
