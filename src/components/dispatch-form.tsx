"use client";

import { useActionState, useState } from "react";
import { dispatchTask } from "@/actions/orders";
import { DELIVERY_METHODS, type DeliveryMethod } from "@/lib/tasks";
import { initialActionState } from "@/lib/types";
import { Field } from "./field";
import { inputClass, primaryButtonClass } from "./styles";

export function DispatchForm({
  helpers,
  products,
  today,
}: {
  helpers: { id: string; displayName: string }[];
  products: { id: string; name: string }[];
  today: string;
}) {
  const [state, action, pending] = useActionState(dispatchTask, initialActionState);
  const [method, setMethod] = useState<DeliveryMethod>("handoff");

  return (
    <form action={action} className="space-y-4">
      {!state.ok ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {state.message}
        </p>
      ) : null}

      <Field label="商品名稱" required hint="要加新的名稱，到下面的商品名稱設定。">
        <select name="productOptionId" required className={inputClass} defaultValue={products[0]?.id ?? ""}>
          {products.length === 0 ? (
            <option value="">請先新增商品名稱</option>
          ) : (
            products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))
          )}
        </select>
      </Field>
      <Field label="下單內容" required hint="寫清楚要買什麼、規格和數量。">
        <textarea
          name="purchaseNote"
          required
          rows={4}
          className={inputClass}
          placeholder="特撰抹茶 100g 兩罐，請選罐裝。"
        />
      </Field>
      <Field label="商品連結" required hint="一行一個。">
        <textarea
          name="productLinks"
          required
          rows={3}
          className={inputClass}
          placeholder={"https://www.marukyu-koyamaen.co.jp/\nhttps://example.com/item"}
        />
      </Field>
      <Field label="派發日期" required>
        <input name="dispatchedOn" required type="date" className={inputClass} defaultValue={today} />
      </Field>
      <Field label="交貨形式" required>
        <select
          name="deliveryMethod"
          required
          className={inputClass}
          value={method}
          onChange={(event) => setMethod(event.target.value as DeliveryMethod)}
        >
          {DELIVERY_METHODS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      {method === "ship_address" ? (
        <Field label="指定地址" required hint="到貨後寄到這個地址。">
          <textarea name="deliveryAddress" required rows={3} className={inputClass} placeholder="台北市大安區…" />
        </Field>
      ) : (
        <p className="text-xs leading-5 text-muted">
          {method === "warehouse" ? "寄到倉庫地址，不用在這裡填門牌。" : "面交不用填地址。小幫手接下後再回報交付資訊。"}
        </p>
      )}
      <Field label="指派給" required>
        <select name="helperId" required className={inputClass} defaultValue="">
          <option value="" disabled>
            請選擇小幫手
          </option>
          {helpers.map((helper) => (
            <option key={helper.id} value={helper.id}>
              {helper.displayName}
            </option>
          ))}
        </select>
      </Field>
      <button className={`${primaryButtonClass} w-full`} type="submit" disabled={pending || products.length === 0 || helpers.length === 0}>
        {pending ? "派發中…" : "發任務"}
      </button>
    </form>
  );
}
