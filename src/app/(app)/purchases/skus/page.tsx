import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ImportCsvForm } from "@/components/sku-editor";
import { Notice } from "@/components/notice";
import { PurchaseNav } from "@/components/purchase-nav";
import { cardClass, inputClass, secondaryButtonClass } from "@/components/styles";
import { getDb } from "@/db";
import { listSkus } from "@/db/skus";
import { requireUser } from "@/lib/current-user";
import { formatMoney } from "@/lib/format";
import { skuLabel } from "@/lib/sku-csv";

export const metadata: Metadata = { title: "商品主檔" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SkusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const query = await searchParams;
  const q = one(query.q) || "";
  const includeArchived = one(query.archived) === "1";
  const rows = listSkus(getDb(), user, { q, includeArchived, limit: 200 });
  const imported = one(query.notice) === "sku_imported";

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">商品</h1>
        <Link href="/purchases/skus/new" className="text-sm font-medium text-sea">
          新增商品
        </Link>
      </div>
      <p className="text-sm leading-6 text-muted">每個規格是一筆商品。進貨時用名稱、編號或品牌搜尋。封存後不能再被新的進貨單選到。</p>
      <PurchaseNav current="/purchases/skus" />
      {imported ? (
        <p className="rounded-xl bg-good-soft px-3 py-2 text-sm text-good" role="status">
          已重新匯入商品表。新增 {one(query.created) || "0"}、更新 {one(query.updated) || "0"}、略過 {one(query.excluded) || "0"}。
        </p>
      ) : (
        <Notice code={one(query.notice)} />
      )}
      <form className="flex gap-2" method="get">
        <input name="q" defaultValue={q} placeholder="名稱、編號、規格、品牌" className={inputClass} />
        {includeArchived ? <input type="hidden" name="archived" value="1" /> : null}
        <button className={secondaryButtonClass} type="submit">
          搜尋
        </button>
      </form>
      <p className="text-sm">
        <Link href={includeArchived ? "/purchases/skus" : "/purchases/skus?archived=1"} className="font-medium text-sea">
          {includeArchived ? "隱藏已封存" : "含已封存"}
        </Link>
      </p>
      {rows.length === 0 ? <p className={`${cardClass} text-sm text-muted`}>沒有符合的商品。</p> : null}
      <ul className="space-y-3">
        {rows.map((sku) => (
          <li key={sku.id}>
            <Link href={`/purchases/skus/${sku.id}`} className={`${cardClass} block`}>
              <p className="text-sm font-semibold">{skuLabel(sku)}</p>
              <p className="mt-1 text-xs text-muted">
                {[sku.category, sku.subcategory].filter(Boolean).join(" · ") || "未分類"}
                {sku.archivedAt ? " · 已封存" : ""}
              </p>
              <p className="mt-1 text-sm">售價 {formatMoney(sku.salePrice, "TWD")} · 成本 {formatMoney(sku.cost, "TWD")}</p>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length >= 200 ? <p className="text-sm text-muted">只顯示前 200 筆。請用搜尋縮小範圍。</p> : null}
      <section className={`${cardClass} space-y-3`}>
        <h2 className="text-base font-semibold">匯入商品表</h2>
        <p className="text-sm leading-6 text-muted">內建表會略過已下架的 MP004。編號空白的商品，若你之後補了編號，重新匯入不會把它清掉。</p>
        <ImportCsvForm />
      </section>
    </div>
  );
}
