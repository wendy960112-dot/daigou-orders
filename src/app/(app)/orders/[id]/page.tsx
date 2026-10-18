import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { acceptTask, restoreOrder } from "@/actions/orders";
import { AttachmentGallery } from "@/components/attachments";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { Notice } from "@/components/notice";
import { FulfillForm } from "@/components/order-form";
import { ProxyNote } from "@/components/proxy-note";
import { StatusForm } from "@/components/status-form";
import { StatusBadges, TaskBadge } from "@/components/status-badges";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/styles";
import { getDb } from "@/db";
import { getOrder, listAttachments, listAudit } from "@/db/orders";
import { getProductOption, listProductOptions } from "@/db/products";
import { canViewOrder } from "@/lib/auth-policy";
import { requireUser } from "@/lib/current-user";
import { formatDate, formatDateTime, formatMoney, todayTaipei } from "@/lib/format";
import { hasProxy } from "@/lib/proxy";
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
  const paymentProofs = files.filter((file) => file.kind === "payment_proof");
  const reimbursementProofs = files.filter((file) => file.kind === "reimbursement_proof");
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
  const proxy = (key: string) => hasProxy(order.proxyFields, key);

  return (
    <div className="space-y-4">
      <Link href={order.deletedAt ? "/orders/deleted" : "/"} className="text-sm font-medium text-sea">
        {order.deletedAt ? "← 回已刪除" : "← 回訂單列表"}
      </Link>
      <Notice code={one(query.notice)} />
      {order.proxyFields ? (
        <p className="rounded-2xl bg-sea-soft px-4 py-3 text-sm leading-6 text-sea">溫蒂代填了部分內容。標了「由管理員代填」的欄位是管理員幫這位小幫手寫的。</p>
      ) : null}
      {order.deletedAt ? (
        <div className="space-y-3 rounded-2xl bg-warn-soft px-4 py-3">
          <p className="text-sm leading-6 text-warn">這張任務已刪除，列表、彙總和小幫手都看不到。截圖還在。</p>
          <form action={restoreOrder}>
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className={`${secondaryButtonClass} w-full`}>
              還原
            </button>
          </form>
        </div>
      ) : null}
      <header className="space-y-2">
        <p className="text-xs text-muted">
          {listed ? formatDate(listed) : "日期未填"}
          {order.orderDate ? "" : order.dispatchedOn ? " 派發" : ""}
          {user.role === "admin" ? ` · ${order.helperName}` : ""}
          {proxy("helper") ? <ProxyNote on /> : null}
        </p>
        <h1 className="text-2xl font-bold leading-8">
          {order.productName}
          <ProxyNote on={proxy("productName")} />
        </h1>
        <p className="text-xl font-bold">
          {moneyText(order.orderAmount, order.orderCurrency, "尚未回報金額")}
          <ProxyNote on={proxy("orderAmount")} />
        </p>
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
        {user.role === "admin" && !order.deletedAt ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/orders/${order.id}/edit`} className={secondaryButtonClass}>
              編輯
            </Link>
            <DeleteOrderButton
              orderId={order.id}
              productName={order.productName}
              paid={order.paid}
              shippingReimbursed={order.shippingReimbursed}
            />
          </div>
        ) : null}
      </header>

      <section className={`${cardClass} space-y-2`}>
        {order.purchaseNote ? (
          <div>
            <h2 className="text-sm font-semibold">
              下單內容
              <ProxyNote on={proxy("purchaseNote")} />
            </h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{order.purchaseNote}</p>
          </div>
        ) : null}
        <div>
          <h2 className="text-sm font-semibold">
            商品連結
            <ProxyNote on={proxy("productLinks")} />
          </h2>
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
            <ProxyNote on={proxy("delivery")} />
            {order.dispatchedOn ? (
              <span className="text-muted">
                {" "}
                · {formatDate(order.dispatchedOn)} 派發
                <ProxyNote on={proxy("dispatchedOn")} />
              </span>
            ) : null}
          </p>
        ) : null}
        {order.deliveryAddress ? <p className="whitespace-pre-wrap text-sm leading-6">{order.deliveryAddress}</p> : null}
        {order.expectedArrivalDate ? <p className="text-sm text-muted">預計到貨 {formatDate(order.expectedArrivalDate)}</p> : null}
        {order.carrier || order.trackingNumber || order.shipDate ? (
          <p className="pt-2 text-sm leading-6">
            {order.carrier ? `${order.carrier} ` : ""}
            <ProxyNote on={proxy("carrier")} />
            {order.trackingNumber ? <span className="break-all">{order.trackingNumber}</span> : null}
            <ProxyNote on={proxy("trackingNumber")} />
            {order.shipDate ? (
              <span className="text-muted">
                {" "}
                · {formatDate(order.shipDate)} 寄出
                <ProxyNote on={proxy("shipDate")} />
              </span>
            ) : null}
          </p>
        ) : null}
        {order.shippingCost != null && shippingCurrency ? (
          <p className="text-sm">
            運費 {formatMoney(order.shippingCost, shippingCurrency)}
            <ProxyNote on={proxy("shippingCost")} />
          </p>
        ) : null}
        {order.notes ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
            {order.notes}
            <ProxyNote on={proxy("notes")} />
          </p>
        ) : null}
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

      {user.role === "admin" && !order.deletedAt ? (
        <StatusForm
          orderId={order.id}
          canPay={canPay}
          paid={order.paid}
          paidAt={order.paidAt}
          paidAmount={order.paidAmount}
          paidCurrency={order.paidCurrency}
          orderAmount={order.orderAmount}
          orderCurrency={order.orderCurrency}
          goodsReceived={order.goodsReceived}
          shippingCost={order.shippingCost}
          shippingReimbursed={order.shippingReimbursed}
          today={todayTaipei()}
        />
      ) : null}

      <AttachmentGallery title={<>訂單截圖<ProxyNote on={proxy("orderProof")} /></>} items={proofs} empty="還沒有訂單截圖。" />
      <AttachmentGallery title="運費收據" items={receipts} empty="還沒有運費收據。" />
      {user.role === "helper" ? <p className="text-xs leading-5 text-muted">匯款證明只有你和溫蒂看得到。</p> : null}
      <AttachmentGallery
        title="匯款截圖"
        items={paymentProofs}
        empty={user.role === "helper" ? "溫蒂還沒上傳匯款截圖。" : "還沒有匯款截圖。"}
        canDelete={user.role === "admin"}
      />
      <AttachmentGallery
        title="運費報銷截圖"
        items={reimbursementProofs}
        empty={user.role === "helper" ? "溫蒂還沒上傳運費報銷截圖。" : "還沒有運費報銷截圖。"}
        canDelete={user.role === "admin"}
      />

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
            hasOrderProof={proofs.length > 0}
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
