"use client";

import { useActionState } from "react";
import { importSkusAction, saveSkuAction, type ImportState } from "@/actions/purchases";
import { initialActionState } from "@/lib/types";
import { Field } from "./field";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "./styles";

export function SkuEditor({
  sku,
}: {
  sku?: {
    id: string;
    code: string | null;
    name: string;
    variant: string;
    category: string | null;
    subcategory: string | null;
    salePrice: number;
    cost: number;
  };
}) {
  const [state, action, pending] = useActionState(saveSkuAction, initialActionState);
  return (
    <form action={action} className="space-y-4">
      {sku ? <input type="hidden" name="skuId" value={sku.id} /> : null}
      {!state.ok ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          {state.message}
        </p>
      ) : null}
      <Field label="商品編號" hint="樂賣沒有編號可以先留空，之後再補。">
        <input name="code" defaultValue={sku?.code ?? ""} className={inputClass} />
      </Field>
      <Field label="商品名稱" required>
        <input name="name" required defaultValue={sku?.name ?? ""} className={inputClass} />
      </Field>
      <Field label="規格" hint="沒有規格就留空。例如 30g罐。">
        <input name="variant" defaultValue={sku?.variant ?? ""} className={inputClass} />
      </Field>
      <Field label="分類">
        <input name="category" defaultValue={sku?.category ?? ""} className={inputClass} />
      </Field>
      <Field label="次分類／品牌">
        <input name="subcategory" defaultValue={sku?.subcategory ?? ""} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="售價" hint="目錄上的新台幣售價。">
          <input name="salePrice" inputMode="numeric" defaultValue={sku?.salePrice ?? ""} className={inputClass} />
        </Field>
        <Field label="成本" hint="目錄上的新台幣成本。">
          <input name="cost" inputMode="numeric" defaultValue={sku?.cost ?? ""} className={inputClass} />
        </Field>
      </div>
      <button className={`${primaryButtonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "儲存中…" : "儲存商品"}
      </button>
    </form>
  );
}

const emptyImport: ImportState = { ...initialActionState, failures: [] };

export function ImportCsvForm() {
  const [state, action, pending] = useActionState(importSkusAction, emptyImport);
  return (
    <div className="space-y-3">
      {!state.ok ? (
        <div className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
          <p>{state.message}</p>
          {state.failures && state.failures.length > 0 ? (
            <ul className="mt-2 list-disc pl-5">
              {state.failures.map((failure) => (
                <li key={`${failure.row}-${failure.reason}`}>
                  第 {failure.row} 列：{failure.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <form action={action}>
        <button className={`${secondaryButtonClass} w-full`} type="submit" disabled={pending}>
          {pending ? "匯入中…" : "重新匯入內建商品表"}
        </button>
      </form>
      <form action={action} className="space-y-2">
        <Field label="或上傳更新的 CSV" hint="用商品編號加規格更新。編號空白時，用名稱加規格對。MP004 會略過。">
          <input name="csv" type="file" accept=".csv,text/csv" className={inputClass} />
        </Field>
        <button className={`${secondaryButtonClass} w-full`} type="submit" disabled={pending}>
          匯入這個 CSV
        </button>
      </form>
    </div>
  );
}
