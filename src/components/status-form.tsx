"use client";

import { useActionState } from "react";
import { updateStatus } from "@/actions/orders";
import { currencyLabel } from "@/lib/format";
import { initialActionState, type Currency } from "@/lib/types";
import { cardClass, inputClass, primaryButtonClass } from "./styles";

const fileClass = `${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand`;

export function StatusForm({
  orderId,
  canPay,
  paid,
  paidAt,
  paidAmount,
  paidCurrency,
  orderAmount,
  orderCurrency,
  goodsReceived,
  shippingCost,
  shippingReimbursed,
  today,
}: {
  orderId: string;
  canPay: boolean;
  paid: boolean;
  paidAt: string | null;
  paidAmount: number | null;
  paidCurrency: Currency | null;
  orderAmount: number | null;
  orderCurrency: Currency | null;
  goodsReceived: boolean;
  shippingCost: number | null;
  shippingReimbursed: boolean;
  today: string;
}) {
  const [state, action, pending] = useActionState(updateStatus, initialActionState);

  return (
    <form action={action} className={`${cardClass} space-y-4`}>
      <div>
        <h2 className="text-base font-semibold">狀態</h2>
        <p className="mt-1 text-xs leading-5 text-muted">只有管理員可以改。日圓和新台幣不會自動換算。</p>
      </div>
      {!state.ok ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {state.message}
        </p>
      ) : null}
      <input type="hidden" name="orderId" value={orderId} />
      <label className={`flex min-h-11 items-center gap-3 text-base font-medium ${canPay ? "" : "opacity-60"}`}>
        <input type="checkbox" name="paid" value="on" defaultChecked={paid} disabled={!canPay} className="size-5 accent-brand" />
        已匯款
      </label>
      <p className="text-xs leading-5 text-muted">
        {canPay ? "錢已經轉給這位小幫手後再勾。金額可以跟訂單不同，例如用新台幣匯日圓的單。" : "小幫手還沒回報訂購金額，先不要勾已匯款。"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          匯款日期
          <input type="date" name="paidAt" defaultValue={paidAt ?? today} className={inputClass} />
        </label>
        <label className="block text-sm">
          匯款金額
          <input name="paidAmount" inputMode="numeric" defaultValue={paidAmount ?? orderAmount ?? ""} className={inputClass} />
        </label>
      </div>
      <label className="block text-sm">
        匯款幣別
        <select name="paidCurrency" defaultValue={paidCurrency ?? orderCurrency ?? "JPY"} className={inputClass}>
          <option value="JPY">{currencyLabel("JPY")} JPY</option>
          <option value="TWD">{currencyLabel("TWD")} TWD</option>
        </select>
      </label>
      {canPay ? (
        <label className="block text-sm">
          匯款截圖
          <input name="paymentProofs" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className={fileClass} />
          <span className="mt-1 block text-xs leading-5 text-muted">轉帳證明。這位小幫手看得到，其他小幫手看不到。</span>
        </label>
      ) : null}
      <label className="flex min-h-11 items-center gap-3 text-base font-medium">
        <input type="checkbox" name="goodsReceived" value="on" defaultChecked={goodsReceived} className="size-5 accent-brand" />
        已收到貨
      </label>
      <p className="text-xs leading-5 text-muted">溫蒂收到小幫手轉寄的包裹後勾選。</p>
      <label className={`flex min-h-11 items-center gap-3 text-base font-medium ${shippingCost == null ? "opacity-60" : ""}`}>
        <input
          type="checkbox"
          name="shippingReimbursed"
          value="on"
          defaultChecked={shippingReimbursed}
          disabled={shippingCost == null}
          className="size-5 accent-brand"
        />
        運費已報銷
      </label>
      <p className="text-xs leading-5 text-muted">
        {shippingCost == null ? "小幫手還沒填運費金額，還不能報銷。" : "運費已照收據金額還給小幫手後勾選。"}
      </p>
      {shippingCost != null ? (
        <label className="block text-sm">
          運費報銷截圖
          <input
            name="reimbursementProofs"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            className={fileClass}
          />
          <span className="mt-1 block text-xs leading-5 text-muted">報銷轉帳證明。這位小幫手看得到，其他小幫手看不到。</span>
        </label>
      ) : null}
      <button type="submit" className={`${primaryButtonClass} w-full`} disabled={pending}>
        {pending ? "儲存中…" : "儲存狀態"}
      </button>
    </form>
  );
}
