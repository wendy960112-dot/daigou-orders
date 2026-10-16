import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptTask } from "@/actions/orders";
import { cardClass, primaryButtonClass } from "@/components/styles";
import { getDb } from "@/db";
import { listInbox } from "@/db/orders";
import { requireUser } from "@/lib/current-user";
import { formatDate } from "@/lib/format";
import { deliveryLabel } from "@/lib/tasks";

export const metadata: Metadata = { title: "接收新單" };

export default async function InboxPage() {
  const user = await requireUser();
  if (user.role !== "helper") redirect("/");
  const tasks = listInbox(getDb(), user.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">接收新單</h1>
        <p className="mt-1 text-sm text-muted">
          {tasks.length > 0 ? `${tasks.length} 張派給你、還沒接下的任務` : "目前沒有新任務"}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className={`${cardClass} text-sm leading-6 text-muted`}>
          新任務會出現在這裡。已經接下的單請到
          <Link href="/" className="font-medium text-brand">
            訂單
          </Link>
          回報。
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const when = task.dispatchedOn ?? task.orderDate;
            return (
              <li key={task.id} className={`${cardClass} space-y-3`}>
                <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
                  <span>{when ? `派發 ${formatDate(when)}` : "派發日期未填"}</span>
                  <span className="rounded-full bg-warn-soft px-2.5 py-1 font-medium text-warn">待接單</span>
                </div>
                <h2 className="text-lg font-bold leading-7">{task.productName}</h2>
                {task.purchaseNote ? <p className="whitespace-pre-wrap text-sm leading-6">{task.purchaseNote}</p> : null}
                <p className="text-sm text-muted">交貨：{deliveryLabel(task.deliveryMethod)}</p>
                {task.deliveryAddress ? <p className="whitespace-pre-wrap text-sm leading-6">{task.deliveryAddress}</p> : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <form action={acceptTask} className="sm:flex-1">
                    <input type="hidden" name="orderId" value={task.id} />
                    <button type="submit" className={`${primaryButtonClass} w-full`}>
                      接下這張單
                    </button>
                  </form>
                  <Link
                    href={`/orders/${task.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-medium sm:flex-1"
                  >
                    查看內容
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
