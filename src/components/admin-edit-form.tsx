"use client";

import { useActionState, useState } from "react";
import { saveAdminEdit } from "@/actions/orders";
import { currencyLabel } from "@/lib/format";
import { DEFAULT_CARRIER, DELIVERY_METHODS, type DeliveryMethod, type TaskStatus } from "@/lib/tasks";
import { initialActionState, type Currency } from "@/lib/types";
import { Field } from "./field";
import { inputClass, primaryButtonClass } from "./styles";

const fileClass = `${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand`;

type NamedFile = { id: string; fileName: string };

export function AdminEditForm({
  orderId,
  helpers,
  products,
  selectedOptionId,
  helperId,
  purchaseNote,
  productLinks,
  dispatchedOn,
  deliveryMethod,
  deliveryAddress,
  taskStatus,
  orderAmount,
  orderCurrency,
  orderDate,
  trackingNumber,
  shipDate,
  shippingCost,
  shippingCurrency,
  notes,
  proofIds,
  orderProofs,
  shippingReceipts,
  paymentProofs,
  reimbursementProofs,
  paid,
  paidAt,
  paidAmount,
  paidCurrency,
  goodsReceived,
  shippingReimbursed,
  today,
}: {
  orderId: string;
  helpers: { id: string; displayName: string }[];
  products: { id: string; name: string }[];
  selectedOptionId: string;
  helperId: string;
  purchaseNote: string;
  productLinks: string;
  dispatchedOn: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  taskStatus: TaskStatus;
  orderAmount: number | null;
  orderCurrency: Currency | null;
  orderDate: string | null;
  trackingNumber: string | null;
  shipDate: string | null;
  shippingCost: number | null;
  shippingCurrency: Currency | null;
  notes: string | null;
  proofIds: string[];
  orderProofs: NamedFile[];
  shippingReceipts: NamedFile[];
  paymentProofs: NamedFile[];
  reimbursementProofs: NamedFile[];
  paid: boolean;
  paidAt: string | null;
  paidAmount: number | null;
  paidCurrency: Currency | null;
  goodsReceived: boolean;
  shippingReimbursed: boolean;
  today: string;
}) {
  const [state, action, pending] = useActionState(saveAdminEdit, initialActionState);
  const [clientError, setClientError] = useState<string | null>(null);
  const [method, setMethod] = useState<DeliveryMethod>(deliveryMethod);
  const [saveReport, setSaveReport] = useState(orderAmount != null);

  return (
    <form
      action={action}
      className="space-y-6"
      onSubmit={(event) => {
        if (!saveReport) {
          setClientError(null);
          return;
        }
        const form = event.currentTarget;
        const removed = new Set(
          [...form.querySelectorAll<HTMLInputElement>('input[name="removeFile"]:checked')].map((input) => input.value),
        );
        const kept = proofIds.filter((id) => !removed.has(id)).length;
        const field = form.elements.namedItem("orderProofs");
        const selected = field instanceof HTMLInputElement ? (field.files?.length ?? 0) : 0;
        if (kept + selected < 1) {
          event.preventDefault();
          setClientError("請上傳訂單截圖。");
          return;
        }
        setClientError(null);
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-sm leading-6 text-muted">
        小幫手用 LINE 傳資料、沒有自己填系統時，在這裡幫他填。儲存後他打開自己的訂單就看得到，代填的欄位會標「由管理員代填」。
      </p>
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

      <section className="space-y-4">
        <h2 className="text-base font-semibold">任務內容</h2>
        <Field label="商品名稱" required>
          <select name="productOptionId" required className={inputClass} defaultValue={selectedOptionId}>
            {selectedOptionId ? null : (
              <option value="" disabled>
                請選擇商品名稱
              </option>
            )}
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="下單內容" required>
          <textarea name="purchaseNote" required rows={4} className={inputClass} defaultValue={purchaseNote} />
        </Field>
        <Field label="商品連結" required hint="一行一個。">
          <textarea name="productLinks" required rows={3} className={inputClass} defaultValue={productLinks} />
        </Field>
        <Field label="派發日期" required>
          <input name="dispatchedOn" required type="date" className={inputClass} defaultValue={dispatchedOn} />
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
          <Field label="指定地址" required>
            <textarea name="deliveryAddress" required rows={3} className={inputClass} defaultValue={deliveryAddress} />
          </Field>
        ) : (
          <p className="text-xs leading-5 text-muted">{method === "warehouse" ? "寄到倉庫地址，不用填門牌。" : "面交不用填地址。"}</p>
        )}
        <Field label="指派給" required hint="改派之後，原本的小幫手就看不到這張單。">
          <select name="helperId" required className={inputClass} defaultValue={helperId}>
            {helpers.map((helper) => (
              <option key={helper.id} value={helper.id}>
                {helper.displayName}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">代填下單內容</h2>
        <label className="flex min-h-11 items-center gap-3 text-base font-medium">
          <input
            type="checkbox"
            name="saveReport"
            value="on"
            checked={saveReport}
            onChange={(event) => {
              setSaveReport(event.target.checked);
              if (!event.target.checked) setClientError(null);
            }}
            className="size-5 accent-brand"
          />
          代填金額和截圖
        </label>
        <p className="text-xs leading-5 text-muted">
          勾了之後會標成已下單。只有追蹤單號或寄出日期會把進度變成已寄出。物流公司固定是 {DEFAULT_CARRIER}，不會因此變成已寄出。一定要有訂單截圖。
        </p>
        {taskStatus === "pending" && !saveReport ? (
          <label className="flex min-h-11 items-center gap-3 text-base font-medium">
            <input type="checkbox" name="markAccepted" value="on" className="size-5 accent-brand" />
            代為接下（先不填金額）
          </label>
        ) : null}
        {saveReport ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="訂購金額" required>
                <input name="orderAmount" required inputMode="numeric" defaultValue={orderAmount ?? ""} className={inputClass} />
              </Field>
              <Field label="幣別" required>
                <select name="orderCurrency" required defaultValue={orderCurrency ?? "JPY"} className={inputClass}>
                  <option value="JPY">{currencyLabel("JPY")} JPY</option>
                  <option value="TWD">{currencyLabel("TWD")} TWD</option>
                </select>
              </Field>
            </div>
            <Field label="訂購日期" required>
              <input name="orderDate" required type="date" defaultValue={orderDate ?? today} className={inputClass} />
            </Field>
            <Field label="物流公司" hint="固定為 EMS。不會因此變成已寄出。">
              <input name="carrier" readOnly value={DEFAULT_CARRIER} className={`${inputClass} bg-paper text-muted`} />
            </Field>
            <Field label="追蹤單號" hint="非必填。有填追蹤單號或寄出日期，進度才會變成已寄出。">
              <input name="trackingNumber" defaultValue={trackingNumber ?? ""} className={inputClass} />
            </Field>
            <Field label="寄出日期" hint="有填追蹤單號或寄出日期，進度才會變成已寄出。">
              <input name="shipDate" type="date" defaultValue={shipDate ?? ""} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="運費" hint="還沒寄出可以先空白。">
                <input name="shippingCost" inputMode="numeric" defaultValue={shippingCost ?? ""} className={inputClass} />
              </Field>
              <Field label="運費幣別">
                <select name="shippingCurrency" defaultValue={shippingCurrency ?? orderCurrency ?? "JPY"} className={inputClass}>
                  <option value="JPY">{currencyLabel("JPY")} JPY</option>
                  <option value="TWD">{currencyLabel("TWD")} TWD</option>
                </select>
              </Field>
            </div>
            <Field label="備註">
              <textarea name="notes" rows={3} defaultValue={notes ?? ""} className={inputClass} />
            </Field>
            <ReplaceFiles files={orderProofs} label="訂單截圖" />
            <Field label="訂單截圖" required hint="JPG、PNG、WEBP 或 PDF，最多 8 個。">
              <input name="orderProofs" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className={fileClass} />
            </Field>
            <ReplaceFiles files={shippingReceipts} label="運費收據" />
            <Field label="運費收據" hint="小幫手沒有自己上傳時，可以在這裡補。">
              <input name="shippingReceipts" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className={fileClass} />
            </Field>
          </>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">匯款與報銷</h2>
        <p className="text-xs leading-5 text-muted">跟任務頁的狀態一樣。要換截圖就先勾要移除的，再選新檔案。日圓和新台幣不會自動換算。</p>
        <label className="flex min-h-11 items-center gap-3 text-base font-medium">
          <input type="checkbox" name="paid" value="on" defaultChecked={paid} className="size-5 accent-brand" />
          已匯款
        </label>
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
        <ReplaceFiles files={paymentProofs} label="匯款截圖" />
        <label className="block text-sm">
          匯款截圖
          <input name="paymentProofs" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className={fileClass} />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-base font-medium">
          <input type="checkbox" name="goodsReceived" value="on" defaultChecked={goodsReceived} className="size-5 accent-brand" />
          已收到貨
        </label>
        <label className="flex min-h-11 items-center gap-3 text-base font-medium">
          <input type="checkbox" name="shippingReimbursed" value="on" defaultChecked={shippingReimbursed} className="size-5 accent-brand" />
          運費已報銷
        </label>
        <p className="text-xs leading-5 text-muted">要先有運費金額才能勾。可以跟上面的代填一起存。</p>
        <ReplaceFiles files={reimbursementProofs} label="運費報銷截圖" />
        <label className="block text-sm">
          運費報銷截圖
          <input name="reimbursementProofs" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className={fileClass} />
        </label>
      </section>

      <button className={`${primaryButtonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "儲存中…" : "儲存代填"}
      </button>
    </form>
  );
}

function ReplaceFiles({ files, label }: { files: NamedFile[]; label: string }) {
  if (files.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">現有{label}</p>
      <p className="text-xs leading-5 text-muted">要換掉就先勾選，儲存時會移除，再上傳新的。</p>
      <ul className="space-y-2">
        {files.map((file) => (
          <li key={file.id}>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="removeFile" value={file.id} className="size-5 accent-brand" />
              <span className="truncate">{file.fileName}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
