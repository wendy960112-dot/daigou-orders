import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { acceptTask, updateStatus } from "@/actions/orders";
import { AttachmentGallery } from "@/components/attachments";
import { Notice } from "@/components/notice";
import { FulfillForm } from "@/components/order-form";
import { StatusBadges, TaskBadge } from "@/components/status-badges";
import { cardClass, inputClass, primaryButtonClass } from "@/components/styles";
import { getDb } from "@/db";
import { getOrder, listAttachments, listAudit } from "@/db/orders";
import { getProductOption, listProductOptions } from "@/db/products";
import { canViewOrder } from "@/lib/auth-policy";
import { requireUser } from "@/lib/current-user";
import { currencyLabel, formatDate, formatDateTime, formatMoney, todayTaipei } from "@/lib/format";
import { deliveryLabel, resolveTaskStatus } from "@/lib/tasks";
import type { Currency } from "@/lib/types";

export const metadata: Metadata = { title: "訂單" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function moneyText(amount: number | null, currency: Currency | null, empty: string) {
  if (amount == null || !currency) return empty;
  return formatMoney(amount, currency);
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
  const links = (order.productLinks ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  const taskStatus = resolveTaskStatus(order);
  const shippingCurrency = order.shippingCurrency ?? order.orderCurrency;
  const canPay = order.orderAmount != null && order.orderCurrency != null;
  const listed = order.orderDate ?? order.dispatchedOn;

  const activeOptions = listProductOptions(db, { activeOnly: true });
  const currentOption = order.productOptionId ? getProductOption(db, order.productOptionId) : null;
  const options =
    currentOption && !activeOptions.some((option) => option.id === currentOption.id)
      ? [currentOption, ...activeOptions]
      : activeOptions;
  const selectedOptionId =
    (order.productOptionId && options.some((option) => option.id === order.productOptionId) ? order.productOptionId : null) ??
    options.find((option) => option.name === order.productName)?.id ??
    "";

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm font-medium text-sea">
        ← 回訂單列表
      </Link>
      <Notice code={one(query.notice)} />
      <header className="space-y-2">
        <p className="text-xs text-muted">
          {listed ? formatDate(listed) : "日期未填"}
          {order.orderDate ? "" : order.dispatchedOn ? " 派發" : ""}
          {user.role === "admin" ? ` · ${order.helperName}` : ""}
        </p>
        <h1 className="text-2xl font-bold leading-8">{order.productName}</h1>
        <p className="text-xl font-bold">{moneyText(order.orderAmount, order.orderCurrency, "尚未回報金額")}</p>
        {order.quantity != null ? <p className="text-sm text-muted">數量 {order.quantity}</p> : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <TaskBadge status={taskStatus} />
          <StatusBadges
            paid={order.paid}
            goodsReceived={order.goodsReceived}
            shippingCost={order.shippingCost}
            shippingReimbursed={order.shippingReimbursed}
          />
        </div>
      </header>

      <section className={`${cardClass} space-y-2`}>
        {order.purchaseNote ? (
          <div>
            <h2 className="text-sm font-semibold">下單內容</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{order.purchaseNote}</p>
          </div>
        ) : null}
        <div>
          <h2 className="text-sm font-semibold">商品連結</h2>
          {links.length === 0 ? <p className="mt-1 text-sm text-muted">沒有商品連結。</p> : null}
          <ul className="mt-1 space-y-1">
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
        </div>
        {order.deliveryMethod ? (
          <p className="text-sm leading-6">
            交貨形式：{deliveryLabel(order.deliveryMethod)}
            {order.dispatchedOn ? <span className="text-muted"> · {formatDate(order.dispatchedOn)} 派發</span> : null}
          </p>
        ) : null}
        {order.deliveryAddress ? <p className="whitespace-pre-wrap text-sm leading-6">{order.deliveryAddress}</p> : null}
        {order.expectedArrivalDate ? <p className="text-sm text-muted">預計到貨 {formatDate(order.expectedArrivalDate)}</p> : null}
        {order.carrier || order.trackingNumber || order.shipDate ? (
          <p className="pt-2 text-sm leading-6">
            {order.carrier ? `${order.carrier} ` : ""}
            {order.trackingNumber ? <span className="break-all">{order.trackingNumber}</span> : null}
            {order.shipDate ? <span className="text-muted"> · {formatDate(order.shipDate)} 寄出</span> : null}
          </p>
        ) : null}
        {order.shippingCost != null && shippingCurrency ? (
          <p className="text-sm">運費 {formatMoney(order.shippingCost, shippingCurrency)}</p>
        ) : null}
        {order.notes ? <p className="whitespace-pre-wrap text-sm leading-6 text-muted">{order.notes}</p> : null}
      </section>

      {user.role === "helper" && taskStatus === "pending" ? (
        <form action={acceptTask} className={`${cardClass} space-y-3`}>
          <h2 className="text-base font-semibold">這張單還沒接下</h2>
          <p className="text-sm leading-6 text-muted">接下之後才能填金額、上傳訂單截圖和運費。</p>
          <input type="hidden" name="orderId" value={order.id} />
          <button type="submit" className={`${primaryButtonClass} w-full`}>
            接下這張單
          </button>
        </form>
      ) : null}

      {user.role === "admin" ? (
        <form action={updateStatus} className={`${cardClass} space-y-4`}>
          <div>
            <h2 className="text-base font-semibold">狀態</h2>
            <p className="mt-1 text-xs leading-5 text-muted">只有管理員可以改。日圓和新台幣不會自動換算。</p>
          </div>
          <input type="hidden" name="orderId" value={order.id} />
          <label className={`flex min-h-11 items-center gap-3 text-base font-medium ${canPay ? "" : "opacity-60"}`}>
            <input
              type="checkbox"
              name="paid"
              value="on"
              defaultChecked={order.paid}
              disabled={!canPay}
              className="size-5 accent-brand"
            />
            已匯款
          </label>
          <p className="text-xs leading-5 text-muted">
            {canPay ? "錢已經轉給這位小幫手後再勾。金額可以跟訂單不同，例如用新台幣匯日圓的單。" : "小幫手還沒回報訂購金額，先不要勾已匯款。"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              匯款日期
              <input type="date" name="paidAt" defaultValue={order.paidAt ?? todayTaipei()} className={inputClass} />
            </label>
            <label className="block text-sm">
              匯款金額
              <input name="paidAmount" inputMode="numeric" defaultValue={order.paidAmount ?? order.orderAmount ?? ""} className={inputClass} />
            </label>
          </div>
          <label className="block text-sm">
            匯款幣別
            <select name="paidCurrency" defaultValue={order.paidCurrency ?? order.orderCurrency ?? "JPY"} className={inputClass}>
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
            {order.shippingCost == null ? "小幫手還沒填運費金額，還不能報銷。" : "運費已照收據金額還給小幫手後勾選。"}
          </p>
          <button type="submit" className={`${primaryButtonClass} w-full`}>
            儲存狀態
          </button>
        </form>
      ) : null}

      <AttachmentGallery title="訂單截圖" items={proofs} empty="還沒有訂單截圖。" />
      <AttachmentGallery title="運費收據" items={receipts} empty="還沒有運費收據。" />

      {user.role === "helper" && taskStatus !== "pending" ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{order.orderAmount == null ? "回報下單" : "修改回報"}</h2>
          <FulfillForm
            orderId={order.id}
            options={options.map((option) => ({ id: option.id, name: option.name }))}
            selectedOptionId={selectedOptionId}
            deliveryMethod={order.deliveryMethod}
            today={todayTaipei()}
            alreadyReported={order.orderAmount != null}
            initial={order}
          />
        </section>
      ) : null}

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
