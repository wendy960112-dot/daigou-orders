"use client";

import { useActionState, useMemo, useState } from "react";
import { savePurchaseAction } from "@/actions/purchases";
import { currencyLabel, formatMoney } from "@/lib/format";
import { initialActionState, type Currency } from "@/lib/types";
import { Field } from "./field";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "./styles";

type SkuChoice = { id: string; label: string; salePrice: number };
type LineState = { key: string; skuId: string; query: string; quantity: string; unitPrice: string };

const fileClass = `${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand`;
const DEFAULT_SUPPLIERS = ["丸久小山園官網", "小幫手", "樂天"];

function newLine(): LineState {
  return { key: crypto.randomUUID(), skuId: "", query: "", quantity: "1", unitPrice: "" };
}

function amountOf(line: LineState) {
  if (!/^\d+$/.test(line.quantity) || !/^\d+$/.test(line.unitPrice)) return 0;
  return Number(line.quantity) * Number(line.unitPrice);
}

export function PurchaseForm({
  purchaseId,
  skus,
  suppliers,
  orders,
  today,
  initial,
  files = [],
}: {
  purchaseId?: string;
  skus: SkuChoice[];
  suppliers: string[];
  orders: { id: string; label: string }[];
  today: string;
  initial?: {
    purchasedOn: string;
    supplier: string;
    currency: Currency;
    orderId: string | null;
    shippingFee: number;
    otherFees: number;
    notes: string | null;
    sourceRef: string | null;
    sourceSubject: string | null;
    lines: { skuId: string; quantity: number; unitPrice: number; label: string }[];
  };
  files?: { id: string; fileName: string }[];
}) {
  const [state, action, pending] = useActionState(savePurchaseAction, initialActionState);
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "JPY");
  const [lines, setLines] = useState<LineState[]>(
    initial?.lines.length
      ? initial.lines.map((line) => ({
          key: crypto.randomUUID(),
          skuId: line.skuId,
          query: line.label,
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
        }))
      : [newLine()],
  );
  const [shippingFee, setShippingFee] = useState(initial ? String(initial.shippingFee || "") : "");
  const [otherFees, setOtherFees] = useState(initial ? String(initial.otherFees || "") : "");
  const supplierSuggestions = [...new Set([...DEFAULT_SUPPLIERS, ...suppliers])];
  const goods = lines.reduce((sum, line) => sum + amountOf(line), 0);
  const shipping = /^\d+$/.test(shippingFee) ? Number(shippingFee) : 0;
  const other = /^\d+$/.test(otherFees) ? Number(otherFees) : 0;
  const total = goods + shipping + other;

  return (
    <form action={action} className="space-y-5">
      {purchaseId ? <input type="hidden" name="purchaseId" value={purchaseId} /> : null}
      {!state.ok ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {state.message}
        </p>
      ) : null}
      <Field label="進貨日期" required>
        <input name="purchasedOn" type="date" required defaultValue={initial?.purchasedOn ?? today} className={inputClass} />
      </Field>
      <Field label="供應商／來源" required hint="例如丸久小山園官網、小幫手、樂天。打過的名稱會出現在建議裡。">
        <input name="supplier" required list="supplier-suggestions" defaultValue={initial?.supplier ?? ""} className={inputClass} placeholder="丸久小山園官網" />
        <datalist id="supplier-suggestions">
          {supplierSuggestions.map((supplier) => (
            <option key={supplier} value={supplier} />
          ))}
        </datalist>
      </Field>
      <Field label="幣別" required hint="這張單的商品、運費和其他費用都用這個幣別。不會自動換匯。">
        <select
          name="currency"
          required
          className={inputClass}
          value={currency}
          onChange={(event) => setCurrency(event.target.value as Currency)}
        >
          <option value="JPY">{currencyLabel("JPY")} JPY</option>
          <option value="TWD">{currencyLabel("TWD")} TWD</option>
        </select>
      </Field>
      <Field label="相關任務" hint="選填。若這次進貨是幫某張代購任務買的，可以連過去。">
        <select name="orderId" className={inputClass} defaultValue={initial?.orderId ?? ""}>
          <option value="">不連結任務</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.label}
            </option>
          ))}
        </select>
      </Field>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">品項</h2>
        {lines.map((line, index) => (
          <LineEditor
            key={line.key}
            line={line}
            index={index}
            skus={skus}
            currency={currency}
            canRemove={lines.length > 1}
            onChange={(next) => setLines((current) => current.map((item) => (item.key === line.key ? next : item)))}
            onRemove={() => setLines((current) => current.filter((item) => item.key !== line.key))}
          />
        ))}
        <button type="button" className={`${secondaryButtonClass} w-full`} onClick={() => setLines((current) => [...current, newLine()])}>
          再加一項
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Field label="運費" hint="沒有就留空。">
          <input name="shippingFee" inputMode="numeric" value={shippingFee} onChange={(event) => setShippingFee(event.target.value)} className={inputClass} />
        </Field>
        <Field label="其他費用" hint="手續費、稅，沒有就留空。">
          <input name="otherFees" inputMode="numeric" value={otherFees} onChange={(event) => setOtherFees(event.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="rounded-2xl bg-brand-soft px-4 py-3 text-sm leading-6">
        <p>商品合計 {formatMoney(goods, currency)}</p>
        <p>運費 {formatMoney(shipping, currency)}</p>
        <p>其他費用 {formatMoney(other, currency)}</p>
        <p className="text-base font-bold">總計 {formatMoney(total, currency)}</p>
      </div>
      <Field label="備註">
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className={inputClass} placeholder="例如官網訂單號、下單帳號" />
      </Field>
      <details className="rounded-2xl border border-line bg-white px-3 py-2">
        <summary className="cursor-pointer py-2 text-sm font-medium">信件來源（選填）</summary>
        <div className="space-y-3 pb-2">
          <Field label="信件主旨" hint="從確認信抄過來，方便之後對。">
            <input name="sourceSubject" defaultValue={initial?.sourceSubject ?? ""} className={inputClass} />
          </Field>
          <Field label="信件編號" hint="Gmail 訊息編號。同一封信只建一張進貨單。">
            <input name="sourceRef" defaultValue={initial?.sourceRef ?? ""} className={inputClass} />
          </Field>
        </div>
      </details>
      {files.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">現有訂單截圖</p>
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.id}>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" name="removeFile" value={file.id} className="size-5 accent-brand" />
                  <span className="truncate">{file.fileName}</span>
                  <span className="text-xs text-muted">勾了就移除</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Field label="訂單截圖" hint="JPG、PNG、WEBP 或 PDF。可以一次傳多張。">
        <input name="screenshots" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className={fileClass} />
      </Field>
      <button className={`${primaryButtonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "儲存中…" : "儲存進貨"}
      </button>
    </form>
  );
}

function LineEditor({
  line,
  index,
  skus,
  currency,
  canRemove,
  onChange,
  onRemove,
}: {
  line: LineState;
  index: number;
  skus: SkuChoice[];
  currency: Currency;
  canRemove: boolean;
  onChange: (line: LineState) => void;
  onRemove: () => void;
}) {
  const matches = useMemo(() => {
    const needle = line.query.trim().toLowerCase();
    if (!needle || line.skuId) return [];
    return skus.filter((sku) => sku.label.toLowerCase().includes(needle)).slice(0, 8);
  }, [line.query, line.skuId, skus]);

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">第 {index + 1} 項</p>
        {canRemove ? (
          <button type="button" onClick={onRemove} className="text-sm font-medium text-brand">
            移除
          </button>
        ) : null}
      </div>
      <input type="hidden" name="skuId" value={line.skuId} />
      <Field label="商品" required hint="用名稱、編號或品牌搜尋。">
        <input
          value={line.query}
          onChange={(event) => onChange({ ...line, query: event.target.value, skuId: "" })}
          className={inputClass}
          placeholder="中煎 或 HJ004"
          aria-label={`第 ${index + 1} 項商品`}
        />
      </Field>
      {matches.length > 0 ? (
        <ul className="overflow-hidden rounded-xl border border-line">
          {matches.map((sku) => (
            <li key={sku.id}>
              <button
                type="button"
                className="block w-full px-3 py-3 text-left text-sm hover:bg-brand-soft"
                onClick={() => onChange({ ...line, skuId: sku.id, query: sku.label })}
              >
                {sku.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="數量" required>
          <input
            name="quantity"
            inputMode="numeric"
            required
            value={line.quantity}
            onChange={(event) => onChange({ ...line, quantity: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="單價" required>
          <input
            name="unitPrice"
            inputMode="numeric"
            required
            value={line.unitPrice}
            onChange={(event) => onChange({ ...line, unitPrice: event.target.value })}
            className={inputClass}
            placeholder="照收據填"
          />
        </Field>
      </div>
      <p className="text-sm text-muted">小計 {formatMoney(amountOf(line), currency)}</p>
    </div>
  );
}
