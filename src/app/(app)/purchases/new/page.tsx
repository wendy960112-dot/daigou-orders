import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PurchaseForm } from "@/components/purchase-form";
import { PurchaseNav } from "@/components/purchase-nav";
import { getDb } from "@/db";
import { listLinkableOrders, listSuppliers } from "@/db/purchases";
import { listActiveSkus, skuChoices } from "@/db/skus";
import { requireUser } from "@/lib/current-user";
import { todayTaipei } from "@/lib/format";

export const metadata: Metadata = { title: "新增進貨" };

export default async function NewPurchasePage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const db = getDb();
  const orders = listLinkableOrders(db, user).map((order) => ({
    id: order.id,
    label: `${order.productName} · ${order.helperName}`,
  }));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">新增進貨</h1>
      <p className="text-sm leading-6 text-muted">照訂單截圖或確認信填。一列一項，單價照你實際付出的金額。</p>
      <PurchaseNav current="/purchases/new" />
      <PurchaseForm skus={skuChoices(listActiveSkus(db, user))} suppliers={listSuppliers(db, user)} orders={orders} today={todayTaipei()} />
    </div>
  );
}
