import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DispatchForm } from "@/components/dispatch-form";
import { getDb } from "@/db";
import { listProductOptions } from "@/db/products";
import { listHelpers } from "@/db/users";
import { requireUser } from "@/lib/current-user";
import { todayTaipei } from "@/lib/format";

export const metadata: Metadata = { title: "發任務" };

export default async function NewOrderPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/inbox");
  const db = getDb();
  const helpers = listHelpers(db).map((helper) => ({ id: helper.id, displayName: helper.displayName }));
  const products = listProductOptions(db, { activeOnly: true }).map((product) => ({ id: product.id, name: product.name }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">發任務</h1>
        <p className="mt-1 text-sm leading-6 text-muted">派一張採購任務給已核准的小幫手。對方接下後才填金額和截圖。</p>
      </div>
      {helpers.length === 0 ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">還沒有小幫手。請先到「幫手」頁核准。</p>
      ) : null}
      {products.length === 0 ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">還沒有可以使用的商品名稱。</p>
      ) : null}
      <DispatchForm helpers={helpers} products={products} today={todayTaipei()} />
      <p className="text-sm">
        <Link href="/settings" className="font-medium text-sea">
          管理商品名稱
        </Link>
      </p>
    </div>
  );
}
