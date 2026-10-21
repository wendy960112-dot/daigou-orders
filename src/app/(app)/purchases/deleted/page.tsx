import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { cardClass } from "@/components/styles";
import { getDb } from "@/db";
import { listPurchases } from "@/db/purchases";
import { requireUser } from "@/lib/current-user";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/types";

export const metadata: Metadata = { title: "已刪除的進貨" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DeletedPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const query = await searchParams;
  const rows = listPurchases(getDb(), user, { includeDeleted: true });

  return (
    <div className="space-y-4">
      <Link href="/purchases" className="text-sm font-medium text-sea">
        ← 回進貨列表
      </Link>
      <div>
        <h1 className="text-2xl font-bold">已刪除的進貨</h1>
        <p className="mt-1 text-sm leading-6 text-muted">這些進貨不會出現在列表和累計買入。打開一筆可以還原。截圖還留著。</p>
      </div>
      <Notice code={one(query.notice)} />
      {rows.length === 0 ? (
        <p className={`${cardClass} text-sm text-muted`}>目前沒有已刪除的進貨。</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/purchases/${row.id}`} className={`${cardClass} block space-y-1`}>
                <p className="text-xs text-muted">{row.deletedAt ? `${formatDateTime(row.deletedAt)} 刪除` : "已刪除"}</p>
                <h2 className="text-base font-semibold">{row.supplier}</h2>
                <p className="text-sm text-muted">
                  {formatDate(row.purchasedOn)} · {formatMoney(Number(row.goods) + row.shippingFee + row.otherFees, row.currency as Currency)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
