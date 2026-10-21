import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { PurchaseNav } from "@/components/purchase-nav";
import { cardClass, inputClass, secondaryButtonClass } from "@/components/styles";
import { getDb } from "@/db";
import { listPurchases, listSuppliers } from "@/db/purchases";
import { listSkus } from "@/db/skus";
import { requireUser } from "@/lib/current-user";
import { formatDate, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/types";

export const metadata: Metadata = { title: "進貨" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const query = await searchParams;
  const db = getDb();
  const filters = {
    from: one(query.from) || null,
    to: one(query.to) || null,
    supplier: one(query.supplier) || null,
    skuId: one(query.skuId) || null,
    q: one(query.q) || null,
  };
  const rows = listPurchases(db, user, filters);
  const suppliers = listSuppliers(db, user);
  const skuOptions = listSkus(db, user, { limit: 1000 });

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">進貨</h1>
        <Link href="/purchases/deleted" className="text-sm font-medium text-sea">
          已刪除
        </Link>
      </div>
      <p className="text-sm leading-6 text-muted">記自己先買進的貨。這一版只記買入，不算出貨、也不扣庫存。小幫手看不到這裡。</p>
      <PurchaseNav current="/purchases" />
      <Notice code={one(query.notice)} />
      <form className="space-y-3" method="get">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            從
            <input type="date" name="from" defaultValue={filters.from ?? ""} className={inputClass} />
          </label>
          <label className="block text-sm">
            到
            <input type="date" name="to" defaultValue={filters.to ?? ""} className={inputClass} />
          </label>
        </div>
        <label className="block text-sm">
          供應商
          <select name="supplier" defaultValue={filters.supplier ?? ""} className={inputClass}>
            <option value="">全部</option>
            {suppliers.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          商品
          <select name="skuId" defaultValue={filters.skuId ?? ""} className={inputClass}>
            <option value="">全部</option>
            {skuOptions.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {[sku.code, sku.name, sku.variant].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          搜尋
          <input name="q" defaultValue={filters.q ?? ""} placeholder="供應商、備註、商品" className={inputClass} />
        </label>
        <button className={`${secondaryButtonClass} w-full`} type="submit">
          篩選
        </button>
      </form>
      {rows.length === 0 ? <p className={`${cardClass} text-sm text-muted`}>這段期間還沒有進貨。按「新增」記一筆。</p> : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/purchases/${row.id}`} className={`${cardClass} block`}>
              <p className="text-xs text-muted">{formatDate(row.purchasedOn)}</p>
              <p className="mt-1 text-base font-semibold">{row.supplier}</p>
              <p className="mt-1 text-lg font-bold">{formatMoney(Number(row.goods) + row.shippingFee + row.otherFees, row.currency as Currency)}</p>
              <p className="text-sm text-muted">{row.lineCount} 項{row.sourceSubject ? ` · ${row.sourceSubject}` : ""}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
