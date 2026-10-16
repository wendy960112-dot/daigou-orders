"use client";

import { useActionState, useState } from "react";
import { saveOrder } from "@/actions/orders";
import { currencyLabel } from "@/lib/format";
import { DEFAULT_CARRIER, type DeliveryMethod } from "@/lib/tasks";
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
  hasOrderProof,
}: {
  orderId: string;
  options: Option[];
  selectedOptionId: string;
  deliveryMethod: DeliveryMethod | null;
  initial: {
    orderAmount: number | null;
    orderCurrency: Currency | null;
    orderDate: string | null;
    trackingNumber: string | null;
    shipDate: string | null;
    shippingCost: number | null;
    shippingCurrency: Currency | null;
    notes: string | null;
  };
  today: string;
  alreadyReported: boolean;
  hasOrderProof: boolean;
}) {
  const [state, action, pending] = useActionState(saveOrder, initialActionState);
  const [clientError, setClientError] = useState<string | null>(null);
  const shippingTitle = deliveryMethod === "handoff" ? "面交／交付" : "轉寄";

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(event) => {
        if (hasOrderProof) return;
        const field = event.currentTarget.elements.namedItem("orderProofs");
        const selected = field instanceof HTMLInputElement ? field.files : null;
        if (!selected || selected.length === 0) {
          event.preventDefault();
          setClientError("請上傳訂單截圖。");
        }
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      {!state.ok ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {state.message}
        </p>
      ) : null}
      {clientError ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {clientError}
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
      <Field label="訂單截圖" required={!hasOrderProof} hint="回報下單一定要附上。JPG、PNG、WEBP 或 PDF，每個 5MB 以內。">
        <input
          name="orderProofs"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          aria-required={!hasOrderProof}
          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand`}
          onChange={() => setClientError(null)}
        />
      </Field>

      <div className="space-y-4 rounded-2xl border border-line bg-white/60 p-3">
        <p className="text-sm font-semibold">{shippingTitle}</p>
        <Field label="物流公司" hint="固定為 EMS，不用改。">
          <input name="carrier" readOnly value={DEFAULT_CARRIER} aria-readonly="true" className={`${inputClass} bg-paper`} />
        </Field>
        <Field label="追蹤單號（非必填）" hint="沒有單號可以留空。">
          <input name="trackingNumber" className={inputClass} defaultValue={initial.trackingNumber ?? ""} placeholder="可以先留空" />
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
