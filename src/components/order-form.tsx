"use client";

import { useActionState } from "react";
import { saveOrder } from "@/actions/orders";
import { currencyLabel } from "@/lib/format";
import { initialActionState, type Currency } from "@/lib/types";
import { Field } from "./field";
import { inputClass, primaryButtonClass } from "./styles";

type Initial = {
  id?: string;
  helperId?: string;
  productName?: string;
  productLinks?: string;
  quantity?: number;
  orderAmount?: number;
  orderCurrency?: Currency;
  orderDate?: string;
  expectedArrivalDate?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  shipDate?: string | null;
  shippingCost?: number | null;
  shippingCurrency?: Currency | null;
  notes?: string | null;
};

export function OrderForm({
  mode,
  initial,
  helpers,
  isAdmin,
  today,
}: {
  mode: "create" | "edit";
  initial?: Initial;
  helpers: { id: string; displayName: string }[];
  isAdmin: boolean;
  today: string;
}) {
  const [state, action, pending] = useActionState(saveOrder, initialActionState);

  return (
    <form action={action} className="space-y-4">
      {initial?.id ? <input type="hidden" name="orderId" value={initial.id} /> : null}
      {!state.ok ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {state.message}
        </p>
      ) : null}

      {mode === "create" && isAdmin ? (
        <Field label="小幫手" required hint="這筆訂單會歸在這位小幫手名下。">
          <select name="helperId" required className={inputClass} defaultValue={initial?.helperId ?? ""}>
            <option value="" disabled>
              請選擇
            </option>
            {helpers.map((helper) => (
              <option key={helper.id} value={helper.id}>
                {helper.displayName}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field label="商品名稱" required>
        <input name="productName" required className={inputClass} defaultValue={initial?.productName ?? ""} placeholder="無印良品 收納盒" />
      </Field>
      <Field label="商品連結" required hint="一行一個。可以貼 LINE 裡的網址。">
        <textarea
          name="productLinks"
          required
          rows={3}
          className={inputClass}
          defaultValue={initial?.productLinks ?? ""}
          placeholder={"https://jp.mercari.com/item/...\nhttps://item.rakuten.co.jp/..."}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="數量" required>
          <input name="quantity" required inputMode="numeric" className={inputClass} defaultValue={initial?.quantity ?? 1} />
        </Field>
        <Field label="訂購日期" required>
          <input name="orderDate" required type="date" className={inputClass} defaultValue={initial?.orderDate ?? today} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="訂購金額" required hint="填整數，不要小數點。">
          <input name="orderAmount" required inputMode="numeric" className={inputClass} defaultValue={initial?.orderAmount ?? ""} placeholder="2480" />
        </Field>
        <Field label="幣別" required>
          <select name="orderCurrency" className={inputClass} defaultValue={initial?.orderCurrency ?? "JPY"}>
            <option value="JPY">{currencyLabel("JPY")} JPY</option>
            <option value="TWD">{currencyLabel("TWD")} TWD</option>
          </select>
        </Field>
      </div>
      <Field label="訂單截圖" hint="JPG、PNG、WEBP 或 PDF，每個 5MB 以內。">
        <input name="orderProofs" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand`} />
      </Field>
      <Field label="預計到貨日">
        <input name="expectedArrivalDate" type="date" className={inputClass} defaultValue={initial?.expectedArrivalDate ?? ""} />
      </Field>

      <div className="space-y-4 rounded-2xl border border-line bg-white/60 p-3">
        <p className="text-sm font-semibold">轉寄</p>
        <Field label="物流公司">
          <input name="carrier" className={inputClass} defaultValue={initial?.carrier ?? ""} placeholder="黑貓宅急便、Yamato、日本郵便" />
        </Field>
        <Field label="追蹤單號">
          <input name="trackingNumber" className={inputClass} defaultValue={initial?.trackingNumber ?? ""} />
        </Field>
        <Field label="寄出日期">
          <input name="shipDate" type="date" className={inputClass} defaultValue={initial?.shipDate ?? ""} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="運費" hint="照收據填，實報實銷。">
            <input name="shippingCost" inputMode="numeric" className={inputClass} defaultValue={initial?.shippingCost ?? ""} placeholder="850" />
          </Field>
          <Field label="運費幣別">
            <select name="shippingCurrency" className={inputClass} defaultValue={initial?.shippingCurrency ?? initial?.orderCurrency ?? "JPY"}>
              <option value="JPY">{currencyLabel("JPY")} JPY</option>
              <option value="TWD">{currencyLabel("TWD")} TWD</option>
            </select>
          </Field>
        </div>
        <Field label="運費收據／發票">
          <input name="shippingReceipts" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-sea-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-sea`} />
        </Field>
      </div>

      <Field label="備註">
        <textarea name="notes" rows={3} className={inputClass} defaultValue={initial?.notes ?? ""} placeholder="尺寸、色號，或溫蒂交代的收件地址" />
      </Field>
      <button className={`${primaryButtonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "儲存中…" : mode === "create" ? "建立訂單" : "儲存修改"}
      </button>
    </form>
  );
}
