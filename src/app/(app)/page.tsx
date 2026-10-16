import Link from "next/link";
import { getDb } from "@/db";
import { listHelpers } from "@/db/users";
import { countInbox, listMonths, listOrders, listSummaryOrders } from "@/db/orders";
import { MoneyLines } from "@/components/money-lines";
import { Notice } from "@/components/notice";
import { StatusBadges, TaskBadge } from "@/components/status-badges";
import { cardClass, inputClass, secondaryButtonClass } from "@/components/styles";
import { requireUser } from "@/lib/current-user";
import { STATUS_FILTERS, parseFilters } from "@/lib/filters";
import { currentMonthTaipei, formatDate, formatMoney, formatMonth } from "@/lib/format";
import { summarize, sumRows } from "@/lib/summary";
import { TASK_STATUSES, resolveTaskStatus } from "@/lib/tasks";
import type { Currency } from "@/lib/types";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const defaultMonth = currentMonthTaipei();
  const filters = parseFilters(
    {
      helperId: one(params.helperId),
      status: one(params.status),
      month: one(params.month),
      task: one(params.task),
    },
    { defaultMonth },
  );
  const db = getDb();
  const orders = listOrders(db, user, filters);
  const inboxCount = user.role === "helper" ? countInbox(db, user.id) : 0;
  const months = [...new Set([defaultMonth, ...listMonths(db, user.role === "helper" ? user.id : null)])].sort((a, b) =>
    b.localeCompare(a),
  );
  const helpers = user.role === "admin" ? listHelpers(db) : [];
  const mine = listSummaryOrders(db, user.role === "helper" ? user.id : null);
  const scoped = summarize(mine).filter((row) => (filters.month ? row.month === filters.month : true));
  const totals = sumRows(scoped);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{user.role === "admin" ? "全部任務" : "我的任務"}</h1>
        <p className="mt-1 text-sm text-muted">
          {filters.month ? formatMonth(filters.month) : "全部月份"} · {orders.length} 筆
        </p>
      </div>
      <Notice code={one(params.notice)} />

      {inboxCount > 0 ? (
        <Link href="/inbox" className="flex items-center justify-between gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          <span>有 {inboxCount} 張新任務待接單</span>
          <span>接收新單</span>
        </Link>
      ) : null}

      <section className={`${cardClass} grid grid-cols-2 gap-3`}>
        <div>
          <p className="text-xs text-muted">商品還沒匯</p>
          <p className="mt-1 text-sm">
            <MoneyLines bag={totals.goodsOwed} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">運費還沒報銷</p>
          <p className="mt-1 text-sm">
            <MoneyLines bag={totals.shippingOwed} />
          </p>
        </div>
        {user.role === "admin" ? (
          <Link href={filters.month ? `/summary?month=${filters.month}` : "/summary"} className="col-span-2 text-sm font-medium text-sea">
            看彙總明細
          </Link>
        ) : null}
      </section>

      <form className="grid grid-cols-2 gap-2" method="get">
        <select name="month" defaultValue={filters.month ?? ""} className={inputClass} aria-label="月份">
          <option value="">全部月份</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {formatMonth(month)}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status ?? ""} className={inputClass} aria-label="狀態">
          <option value="">全部狀態</option>
          {STATUS_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select name="task" defaultValue={filters.task ?? ""} className={`${inputClass} col-span-2`} aria-label="任務進度">
          <option value="">全部進度</option>
          {TASK_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {user.role === "admin" ? (
          <select name="helperId" defaultValue={filters.helperId ?? ""} className={`${inputClass} col-span-2`} aria-label="小幫手">
            <option value="">全部小幫手</option>
            {helpers.map((helper) => (
              <option key={helper.id} value={helper.id}>
                {helper.displayName}
              </option>
            ))}
          </select>
        ) : null}
        <button className={`${secondaryButtonClass} col-span-2`} type="submit">
          篩選
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { status: "unpaid", label: "未匯款" },
          { status: "not_received", label: "未收貨" },
          { status: "shipping_open", label: "運費未報銷" },
        ].map((chip) => {
          const query = new URLSearchParams();
          if (filters.month) query.set("month", filters.month);
          else query.set("month", "");
          if (filters.helperId) query.set("helperId", filters.helperId);
          if (filters.task) query.set("task", filters.task);
          const active = filters.status === chip.status;
          if (!active) query.set("status", chip.status);
          return (
            <Link
              key={chip.status}
              href={`/?${query.toString()}`}
              className={`shrink-0 rounded-full px-3 py-2 text-sm ${active ? "bg-brand text-white" : "bg-white text-ink border border-line"}`}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className={`${cardClass} text-sm leading-6 text-muted`}>
          這個篩選沒有任務。
          {user.role === "admin" ? (
            <>
              {" "}
              <Link href="/orders/new" className="font-medium text-brand">
                發一張任務
              </Link>
            </>
          ) : null}
          {user.role === "helper" ? (
            <>
              {" "}
              <Link href="/inbox" className="font-medium text-brand">
                看接收新單
              </Link>
            </>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className={`${cardClass} block space-y-2`}>
                <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
                  <span>{formatDate(order.orderDate ?? order.dispatchedOn ?? "")}</span>
                  {user.role === "admin" ? <span>{order.helperName}</span> : null}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="line-clamp-2 text-base font-semibold">{order.productName}</h2>
                  <p className="shrink-0 text-base font-bold">
                    {order.orderAmount != null && order.orderCurrency
                      ? formatMoney(order.orderAmount, order.orderCurrency as Currency)
                      : "尚未下單"}
                  </p>
                </div>
                {order.quantity != null ? <p className="text-xs text-muted">數量 {order.quantity}</p> : null}
                <div className="flex flex-wrap items-center gap-1.5">
                  <TaskBadge status={resolveTaskStatus(order)} />
                <StatusBadges
                  paid={order.paid}
                  goodsReceived={order.goodsReceived}
                  shippingCost={order.shippingCost}
                  shippingReimbursed={order.shippingReimbursed}
                />
                </div>
                {order.trackingNumber ? (
                  <p className="truncate text-xs text-sea">
                    {order.carrier ? `${order.carrier} · ` : ""}
                    {order.trackingNumber}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
