import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminEditForm } from "@/components/admin-edit-form";
import { getDb } from "@/db";
import { getOrder, listAttachments } from "@/db/orders";
import { getProductOption, listProductOptions } from "@/db/products";
import { listHelpers } from "@/db/users";
import { requireUser } from "@/lib/current-user";
import { todayTaipei } from "@/lib/format";
import { isDeliveryMethod, resolveTaskStatus } from "@/lib/tasks";

export const metadata: Metadata = { title: "編輯任務" };

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const { id } = await params;
  const db = getDb();
  const order = getOrder(db, id);
  if (!order) notFound();

  if (order.deletedAt) {
    return (
      <div className="space-y-4">
        <Link href={`/orders/${order.id}`} className="text-sm font-medium text-sea">
          ← 回任務
        </Link>
        <h1 className="text-2xl font-bold">編輯任務</h1>
        <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm leading-6 text-warn">這張任務已刪除，請先還原再編輯。</p>
      </div>
    );
  }

  const helpers = listHelpers(db).map((helper) => ({ id: helper.id, displayName: helper.displayName }));
  if (!helpers.some((helper) => helper.id === order.helperId)) {
    helpers.unshift({ id: order.helperId, displayName: order.helperName });
  }
  const activeOptions = listProductOptions(db, { activeOnly: true });
  const currentOption = order.productOptionId ? getProductOption(db, order.productOptionId) : null;
  const options =
    currentOption && !activeOptions.some((option) => option.id === currentOption.id) ? [currentOption, ...activeOptions] : activeOptions;
  const selectedOptionId =
    (order.productOptionId && options.some((option) => option.id === order.productOptionId) ? order.productOptionId : null) ??
    options.find((option) => option.name === order.productName)?.id ??
    "";
  const files = listAttachments(db, order.id);
  const named = (kind: (typeof files)[number]["kind"]) =>
    files.filter((file) => file.kind === kind).map((file) => ({ id: file.id, fileName: file.fileName }));

  return (
    <div className="space-y-4">
      <Link href={`/orders/${order.id}`} className="text-sm font-medium text-sea">
        ← 回任務
      </Link>
      <div>
        <h1 className="text-2xl font-bold">編輯任務</h1>
        <p className="mt-1 text-sm text-muted">
          {order.productName} · {order.helperName}
        </p>
      </div>
      <AdminEditForm
        orderId={order.id}
        helpers={helpers}
        products={options.map((option) => ({ id: option.id, name: option.name }))}
        selectedOptionId={selectedOptionId}
        helperId={order.helperId}
        purchaseNote={order.purchaseNote ?? ""}
        productLinks={order.productLinks ?? ""}
        dispatchedOn={order.dispatchedOn ?? todayTaipei()}
        deliveryMethod={isDeliveryMethod(order.deliveryMethod) ? order.deliveryMethod : "handoff"}
        deliveryAddress={order.deliveryAddress ?? ""}
        taskStatus={resolveTaskStatus(order)}
        orderAmount={order.orderAmount}
        orderCurrency={order.orderCurrency}
        orderDate={order.orderDate}
        carrier={order.carrier}
        trackingNumber={order.trackingNumber}
        shipDate={order.shipDate}
        shippingCost={order.shippingCost}
        shippingCurrency={order.shippingCurrency}
        notes={order.notes}
        proofIds={named("order_proof").map((file) => file.id)}
        orderProofs={named("order_proof")}
        shippingReceipts={named("shipping_receipt")}
        paymentProofs={named("payment_proof")}
        reimbursementProofs={named("reimbursement_proof")}
        paid={order.paid}
        paidAt={order.paidAt}
        paidAmount={order.paidAmount}
        paidCurrency={order.paidCurrency}
        goodsReceived={order.goodsReceived}
        shippingReimbursed={order.shippingReimbursed}
        today={todayTaipei()}
      />
    </div>
  );
}
