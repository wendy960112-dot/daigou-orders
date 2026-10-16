import type { Metadata } from "next";
import { getDb } from "@/db";
import { listHelpers } from "@/db/users";
import { OrderForm } from "@/components/order-form";
import { requireUser } from "@/lib/current-user";
import { todayTaipei } from "@/lib/format";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "新增訂單" };

export default async function NewOrderPage() {
  const user = await requireUser();
  if (user.role === "pending") redirect("/pending");
  const helpers = user.role === "admin" ? listHelpers(getDb()).map((helper) => ({ id: helper.id, displayName: helper.displayName })) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">新增訂單</h1>
        <p className="mt-1 text-sm leading-6 text-muted">先把商品和金額記下來。匯款、收貨、運費報銷由溫蒂勾選。</p>
      </div>
      {user.role === "admin" && helpers.length === 0 ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">還沒有小幫手。請先到「幫手」頁核准。</p>
      ) : (
        <OrderForm mode="create" helpers={helpers} isAdmin={user.role === "admin"} today={todayTaipei()} />
      )}
    </div>
  );
}
