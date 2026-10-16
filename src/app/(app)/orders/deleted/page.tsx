import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { cardClass } from "@/components/styles";
import { getDb } from "@/db";
import { listOrders } from "@/db/orders";
import { requireUser } from "@/lib/current-user";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "已刪除" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DeletedOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const query = await searchParams;
  const orders = listOrders(getDb(), user, { month: null, includeDeleted: true });

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm font-medium text-sea">
        ← 回任務列表
      </Link>
      <div>
        <h1 className="text-2xl font-bold">已刪除</h1>
        <p className="mt-1 text-sm leading-6 text-muted">這些任務不會出現在列表、彙總和小幫手的畫面。打開一筆可以還原。截圖還留著。</p>
      </div>
      <Notice code={one(query.notice)} />
      {orders.length === 0 ? (
        <p className={`${cardClass} text-sm text-muted`}>目前沒有已刪除的任務。</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className={`${cardClass} block space-y-1`}>
                <p className="text-xs text-muted">
                  {order.deletedAt ? `${formatDateTime(order.deletedAt)} 刪除` : "已刪除"} · {order.helperName}
                </p>
                <h2 className="text-base font-semibold">{order.productName}</h2>
                <p className="text-xs text-muted">{order.orderDate ? formatDate(order.orderDate) : order.dispatchedOn ? `${formatDate(order.dispatchedOn)} 派發` : ""}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
