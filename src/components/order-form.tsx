"use client";

import { useActionState } from "react";
import { saveOrder } from "@/actions/orders";
import { currencyLabel } from "@/lib/format";
import type { DeliveryMethod } from "@/lib/tasks";
import { initialActionState, type Currency } from "@/lib/types";
import { Field } from "./field";
import { inputClass, primaryButtonClass } from "./styles";

type Option = { id: string; name: string };

export function FulfillForm({
  orderId,
  options,
  selectedOptionId,
  deliveryMethod,
  initial,
  today,
  alreadyReported,
}: {
  orderId: string;
  options: Option[];
  selectedOptionId: string;
  deliveryMethod: DeliveryMethod | null;
  initial: {
    orderAmount: number | null;
    orderCurrency: Currency | null;
    orderDate: string | null;
    carrier: string | null;
    trackingNumber: string | null;
    shipDate: string | null;
    shippingCost: number | null;
    shippingCurrency: Currency | null;
    notes: string | null;
  };
  today: string;
  alreadyReported: boolean;
}) {
  const [state, action, pending] = useActionState(saveOrder, initialActionState);
  const shippingTitle = deliveryMethod === "handoff" ? "面交／交付" : "轉寄";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      {!state.ok ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {state.message}
        </p>
      ) : null}

      <Field label="商品名稱" required hint="名單由管理員維護。這張單原本的名稱已經先選好。">
        <select name="productOptionId" required className={inputClass} defaultValue={selectedOptionId}>
          <option value="" disabled>
            請選擇
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="訂購日期" required hint="用實際下單的日期，彙總會照這個月份計算。">
        <input name="orderDate" required type="date" className={inputClass} defaultValue={initial.orderDate ?? today} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="訂購金額" required hint="填整數，不要小數點。">
          <input
            name="orderAmount"
            required
            inputMode="numeric"
            className={inputClass}
            defaultValue={initial.orderAmount ?? ""}
            placeholder="2480"
          />
        </Field>
        <Field label="幣別" required>
          <select name="orderCurrency" className={inputClass} defaultValue={initial.orderCurrency ?? "JPY"}>
            <option value="JPY">{currencyLabel("JPY")} JPY</option>
            <option value="TWD">{currencyLabel("TWD")} TWD</option>
          </select>
        </Field>
      </div>
      <Field label="訂單截圖" hint="JPG、PNG、WEBP 或 PDF，每個 5MB 以內。可以稍後再補。">
        <input
          name="orderProofs"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand`}
        />
      </Field>

      <div className="space-y-4 rounded-2xl border border-line bg-white/60 p-3">
        <p className="text-sm font-semibold">{shippingTitle}</p>
        <Field label={deliveryMethod === "handoff" ? "交付方式" : "物流公司"}>
          <input name="carrier" className={inputClass} defaultValue={initial.carrier ?? ""} placeholder="黑貓宅急便、Yamato、面交" />
        </Field>
        <Field label="追蹤單號">
          <input name="trackingNumber" className={inputClass} defaultValue={initial.trackingNumber ?? ""} />
        </Field>
        <Field label={deliveryMethod === "handoff" ? "交付日期" : "寄出日期"}>
          <input name="shipDate" type="date" className={inputClass} defaultValue={initial.shipDate ?? ""} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="運費" hint="照收據填，實報實銷。面交沒有運費可以留空。">
            <input
              name="shippingCost"
              inputMode="numeric"
              className={inputClass}
              defaultValue={initial.shippingCost ?? ""}
              placeholder="850"
            />
          </Field>
          <Field label="運費幣別">
            <select
              name="shippingCurrency"
              className={inputClass}
              defaultValue={initial.shippingCurrency ?? initial.orderCurrency ?? "JPY"}
            >
              <option value="JPY">{currencyLabel("JPY")} JPY</option>
              <option value="TWD">{currencyLabel("TWD")} TWD</option>
            </select>
          </Field>
        </div>
        <Field label="運費收據／發票">
          <input
            name="shippingReceipts"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-sea-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-sea`}
          />
        </Field>
      </div>

      <Field label="備註">
        <textarea name="notes" rows={3} className={inputClass} defaultValue={initial.notes ?? ""} placeholder="尺寸、色號，或店家備註" />
      </Field>
      <button className={`${primaryButtonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "儲存中…" : alreadyReported ? "儲存修改" : "回報下單"}
      </button>
    </form>
  );
}
