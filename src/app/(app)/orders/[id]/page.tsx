import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateStatus } from "@/actions/orders";
import { getDb } from "@/db";
import { getOrder, listAttachments, listAudit } from "@/db/orders";
import { AttachmentGallery } from "@/components/attachments";
import { Notice } from "@/components/notice";
import { OrderForm } from "@/components/order-form";
import { StatusBadges } from "@/components/status-badges";
import { cardClass, inputClass, primaryButtonClass } from "@/components/styles";
import { canViewOrder } from "@/lib/auth-policy";
import { requireUser } from "@/lib/current-user";
import { currencyLabel, formatDate, formatDateTime, formatMoney, todayTaipei } from "@/lib/format";

export const metadata: Metadata = { title: "訂單" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const db = getDb();
  const order = getOrder(db, id);
  if (!order || !canViewOrder(user, order)) notFound();
  const files = listAttachments(db, order.id);
  const audit = listAudit(db, order.id);
  const proofs = files.filter((file) => file.kind === "order_proof");
  const receipts = files.filter((file) => file.kind === "shipping_receipt");
  const links = order.productLinks.split("\n").filter(Boolean);

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm font-medium text-sea">
        ← 回訂單列表
      </Link>
      <Notice code={one(query.notice)} />
      <header className="space-y-2">
        <p className="text-xs text-muted">
          {formatDate(order.orderDate)}
          {user.role === "admin" ? ` · ${order.helperName}` : ""}
        </p>
        <h1 className="text-2xl font-bold leading-8">{order.productName}</h1>
        <p className="text-xl font-bold">{formatMoney(order.orderAmount, order.orderCurrency)}</p>
        <p className="text-sm text-muted">數量 {order.quantity}</p>
        <StatusBadges
          paid={order.paid}
          goodsReceived={order.goodsReceived}
          shippingCost={order.shippingCost}
          shippingReimbursed={order.shippingReimbursed}
        />
      </header>

      <section className={`${cardClass} space-y-2`}>
        <h2 className="text-sm font-semibold">商品連結</h2>
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link} className="break-all text-sm">
              {/^https?:\/\//i.test(link) ? (
                <a href={link} target="_blank" rel="noreferrer" className="text-sea underline">
                  {link}
                </a>
              ) : (
                link
              )}
            </li>
          ))}
        </ul>
        {order.carrier || order.trackingNumber || order.shipDate ? (
          <p className="pt-2 text-sm leading-6">
            {order.carrier ? `${order.carrier} ` : ""}
            {order.trackingNumber ? <span className="break-all">{order.trackingNumber}</span> : null}
            {order.shipDate ? <span className="text-muted"> · {formatDate(order.shipDate)} 寄出</span> : null}
          </p>
        ) : null}
        {order.shippingCost != null ? (
          <p className="text-sm">運費 {formatMoney(order.shippingCost, order.shippingCurrency ?? order.orderCurrency)}</p>
        ) : null}
        {order.notes ? <p className="whitespace-pre-wrap text-sm leading-6 text-muted">{order.notes}</p> : null}
      </section>

      {user.role === "admin" ? (
        <form action={updateStatus} className={`${cardClass} space-y-4`}>
          <div>
            <h2 className="text-base font-semibold">狀態</h2>
            <p className="mt-1 text-xs leading-5 text-muted">只有管理員可以改。日圓和新台幣不會自動換算。</p>
          </div>
          <input type="hidden" name="orderId" value={order.id} />
          <label className="flex min-h-11 items-center gap-3 text-base font-medium">
            <input type="checkbox" name="paid" value="on" defaultChecked={order.paid} className="size-5 accent-brand" />
            已匯款
          </label>
          <p className="text-xs leading-5 text-muted">錢已經轉給這位小幫手後再勾。金額可以跟訂單不同，例如用新台幣匯日圓的單。</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              匯款日期
              <input type="date" name="paidAt" defaultValue={order.paidAt ?? todayTaipei()} className={inputClass} />
            </label>
            <label className="block text-sm">
              匯款金額
              <input
                name="paidAmount"
                inputMode="numeric"
                defaultValue={order.paidAmount ?? order.orderAmount}
                className={inputClass}
              />
            </label>
          </div>
          <label className="block text-sm">
            匯款幣別
            <select name="paidCurrency" defaultValue={order.paidCurrency ?? order.orderCurrency} className={inputClass}>
              <option value="JPY">{currencyLabel("JPY")} JPY</option>
              <option value="TWD">{currencyLabel("TWD")} TWD</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-3 text-base font-medium">
            <input
              type="checkbox"
              name="goodsReceived"
              value="on"
              defaultChecked={order.goodsReceived}
              className="size-5 accent-brand"
            />
            已收到貨
          </label>
          <p className="text-xs leading-5 text-muted">溫蒂收到小幫手轉寄的包裹後勾選。</p>
          <label className={`flex min-h-11 items-center gap-3 text-base font-medium ${order.shippingCost == null ? "opacity-60" : ""}`}>
            <input
              type="checkbox"
              name="shippingReimbursed"
              value="on"
              defaultChecked={order.shippingReimbursed}
              disabled={order.shippingCost == null}
              className="size-5 accent-brand"
            />
            運費已報銷
          </label>
          <p className="text-xs leading-5 text-muted">
            {order.shippingCost == null ? "請先在下面填運費金額，才能報銷。" : "運費已照收據金額還給小幫手後勾選。"}
          </p>
          <button type="submit" className={`${primaryButtonClass} w-full`}>
            儲存狀態
          </button>
        </form>
      ) : null}

      <AttachmentGallery title="訂單截圖" items={proofs} empty="還沒有訂單截圖。" />
      <AttachmentGallery title="運費收據" items={receipts} empty="還沒有運費收據。" />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">修改訂單</h2>
        <OrderForm
          mode="edit"
          isAdmin={user.role === "admin"}
          helpers={[]}
          today={todayTaipei()}
          initial={order}
        />
      </section>

      <section className={`${cardClass} space-y-3`}>
        <h2 className="text-base font-semibold">異動紀錄</h2>
        {audit.length === 0 ? <p className="text-sm text-muted">還沒有異動紀錄。</p> : null}
        <ol className="space-y-4 border-l border-line pl-4">
          {audit.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand" />
              <p className="text-sm leading-6">{entry.summary}</p>
              <p className="text-xs text-muted">
                {entry.actorName} · {formatDateTime(entry.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
