import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PurchaseForm } from "@/components/purchase-form";
import { getDb } from "@/db";
import { getPurchase, listLinkableOrders, listSuppliers } from "@/db/purchases";
import { listActiveSkus, skuChoices } from "@/db/skus";
import { requireUser } from "@/lib/current-user";
import { todayTaipei } from "@/lib/format";

export const metadata: Metadata = { title: "編輯進貨" };

export default async function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const { id } = await params;
  const db = getDb();
  const purchase = getPurchase(db, user, id);
  if (!purchase) notFound();
  if (purchase.deletedAt) {
    return (
      <div className="space-y-3">
        <Link href={`/purchases/${purchase.id}`} className="text-sm font-medium text-sea">
          ← 回進貨單
        </Link>
        <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">這張進貨已刪除，請先還原再編輯。</p>
      </div>
    );
  }
  const active = listActiveSkus(db, user);
  const known = new Set(active.map((sku) => sku.id));
  const extra = purchase.lines
    .filter((line) => !known.has(line.skuId))
    .map((line) => ({
      id: line.skuId,
      code: line.code,
      name: line.name,
      variant: line.variant,
      subcategory: line.subcategory,
      salePrice: line.unitPrice,
      cost: 0,
      archivedAt: null,
      importKey: null,
      category: null,
      createdAt: "",
      updatedAt: "",
    }));
  return (
    <div className="space-y-4">
      <Link href={`/purchases/${purchase.id}`} className="text-sm font-medium text-sea">
        ← 回進貨單
      </Link>
      <h1 className="text-2xl font-bold">編輯進貨</h1>
      <PurchaseForm
        purchaseId={purchase.id}
        skus={skuChoices([...extra, ...active])}
        suppliers={listSuppliers(db, user)}
        orders={listLinkableOrders(db, user).map((order) => ({ id: order.id, label: `${order.productName} · ${order.helperName}` }))}
        today={todayTaipei()}
        files={purchase.files.map((file) => ({ id: file.id, fileName: file.fileName }))}
        initial={{
          purchasedOn: purchase.purchasedOn,
          supplier: purchase.supplier,
          currency: purchase.currency,
          orderId: purchase.orderId,
          shippingFee: purchase.shippingFee,
          otherFees: purchase.otherFees,
          notes: purchase.notes,
          sourceRef: purchase.sourceRef,
          sourceSubject: purchase.sourceSubject,
          lines: purchase.lines.map((line) => ({
            skuId: line.skuId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            label: line.label,
          })),
        }}
      />
    </div>
  );
}
