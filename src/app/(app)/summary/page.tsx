import type { Metadata } from "next";
import { getDb } from "@/db";
import { listSummaryOrders } from "@/db/orders";
import { MoneyLines } from "@/components/money-lines";
import { cardClass, inputClass, secondaryButtonClass } from "@/components/styles";
import { requireUser } from "@/lib/current-user";
import { currentMonthTaipei, formatMonth } from "@/lib/format";
import { summarize, sumRows, type MonthHelperRow } from "@/lib/summary";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "彙總" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Lines({ row }: { row: Pick<MonthHelperRow, "goodsOwed" | "goodsPaid" | "shippingOwed" | "shippingPaid"> }) {
  const items = [
    ["商品未匯", row.goodsOwed],
    ["商品已匯", row.goodsPaid],
    ["運費未報銷", row.shippingOwed],
    ["運費已報銷", row.shippingPaid],
  ] as const;
  return (
    <dl className="space-y-2">
      {items.map(([label, bag]) => (
        <div key={label} className="flex items-baseline justify-between gap-3 text-sm">
          <dt className="text-muted">{label}</dt>
          <dd className="text-right">
            <MoneyLines bag={bag} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const params = await searchParams;
  const requested = one(params.month);
  const month = requested === undefined ? currentMonthTaipei() : requested === "" || requested === "all" ? null : requested;
  const rows = summarize(listSummaryOrders(getDb()));
  const months = [...new Set([currentMonthTaipei(), ...rows.map((row) => row.month)])].sort((a, b) => b.localeCompare(a));
  const visible = rows.filter((row) => (month ? row.month === month : true));
  const grouped = new Map<string, MonthHelperRow[]>();
  for (const row of visible) {
    const list = grouped.get(row.month) ?? [];
    list.push(row);
    grouped.set(row.month, list);
  }
  const total = sumRows(visible);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">彙總</h1>
        <p className="mt-1 text-sm leading-6 text-muted">依訂購月份統計。日圓和新台幣分開加總，不會換成同一種錢。</p>
      </div>
      <form method="get" className="flex gap-2">
        <select name="month" defaultValue={month ?? ""} className={inputClass} aria-label="月份">
          <option value="">全部月份</option>
          {months.map((item) => (
            <option key={item} value={item}>
              {formatMonth(item)}
            </option>
          ))}
        </select>
        <button className={secondaryButtonClass} type="submit">
          查看
        </button>
      </form>

      <section className={cardClass}>
        <h2 className="mb-3 text-base font-semibold">{month ? `${formatMonth(month)}合計` : "全部合計"}</h2>
        <Lines row={total} />
      </section>

      {[...grouped.entries()].map(([groupMonth, groupRows]) => (
        <section key={groupMonth} className="space-y-3">
          <h2 className="text-lg font-bold">{formatMonth(groupMonth)}</h2>
          {groupRows.map((row) => (
            <article key={`${row.month}-${row.helperId}`} className={cardClass}>
              <h3 className="mb-3 text-base font-semibold">{row.helperName}</h3>
              <Lines row={row} />
            </article>
          ))}
        </section>
      ))}
      {visible.length === 0 ? <p className="text-sm text-muted">這個月份還沒有訂單。</p> : null}
    </div>
  );
}
