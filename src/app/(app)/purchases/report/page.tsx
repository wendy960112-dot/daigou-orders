import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PurchaseNav } from "@/components/purchase-nav";
import { cardClass, inputClass, secondaryButtonClass } from "@/components/styles";
import { getDb } from "@/db";
import { skuSpendReport } from "@/db/purchases";
import { requireUser } from "@/lib/current-user";
import { currencyLabel, formatMoney } from "@/lib/format";
import { skuLabel } from "@/lib/sku-csv";
import type { Currency } from "@/lib/types";

export const metadata: Metadata = { title: "累計買入" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PurchaseReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const query = await searchParams;
  const from = one(query.from) || "";
  const to = one(query.to) || "";
  const rows = skuSpendReport(getDb(), user, { from: from || null, to: to || null });
  const download = `/api/purchases/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">累計買入</h1>
      <p className="text-sm leading-6 text-muted">只算還沒刪除的進貨。日圓和新台幣分開加，不會混在一起，也不扣庫存。</p>
      <PurchaseNav current="/purchases/report" />
      <form className="space-y-3" method="get">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            從
            <input type="date" name="from" defaultValue={from} className={inputClass} />
          </label>
          <label className="block text-sm">
            到
            <input type="date" name="to" defaultValue={to} className={inputClass} />
          </label>
        </div>
        <button className={`${secondaryButtonClass} w-full`} type="submit">
          套用日期
        </button>
      </form>
      <a href={download} className={`${secondaryButtonClass} w-full`}>
        下載 CSV
      </a>
      {rows.length === 0 ? <p className={`${cardClass} text-sm text-muted`}>這段期間還沒有買入紀錄。</p> : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={`${row.skuId}-${row.currency}`} className={cardClass}>
            <p className="text-sm font-semibold">{skuLabel(row)}</p>
            <p className="mt-1 text-xs text-muted">{currencyLabel(row.currency as Currency)}</p>
            <p className="mt-2 text-sm">數量 {Number(row.quantity)}</p>
            <p className="text-lg font-bold">{formatMoney(Number(row.spend), row.currency as Currency)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
