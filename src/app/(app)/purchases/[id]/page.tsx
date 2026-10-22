import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { restorePurchaseAction } from "@/actions/purchases";
import { DeletePurchaseButton } from "@/components/delete-purchase-button";
import { Notice } from "@/components/notice";
import { cardClass, secondaryButtonClass } from "@/components/styles";
import { getDb } from "@/db";
import { getPurchase } from "@/db/purchases";
import { requireUser } from "@/lib/current-user";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "進貨單" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PurchasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const { id } = await params;
  const purchase = getPurchase(getDb(), user, id);
  if (!purchase) notFound();
  const query = await searchParams;

  return (
    <div className="space-y-4">
      <Link href={purchase.deletedAt ? "/purchases/deleted" : "/purchases"} className="text-sm font-medium text-sea">
        {purchase.deletedAt ? "← 回已刪除" : "← 回進貨列表"}
      </Link>
      <Notice code={one(query.notice)} />
      <header className="space-y-2">
        <p className="text-xs text-muted">{formatDate(purchase.purchasedOn)}</p>
        <h1 className="text-2xl font-bold">{purchase.supplier}</h1>
        <p className="text-xl font-bold">{formatMoney(purchase.total, purchase.currency)}</p>
        {purchase.deletedAt ? <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">這張進貨已刪除，列表和累計買入都不算它。截圖還在。</p> : null}
        <div className="flex flex-wrap gap-2">
          {purchase.deletedAt ? (
            <form action={restorePurchaseAction}>
              <input type="hidden" name="purchaseId" value={purchase.id} />
              <button type="submit" className={secondaryButtonClass}>
                還原
              </button>
            </form>
          ) : (
            <>
              <Link href={`/purchases/${purchase.id}/edit`} className={secondaryButtonClass}>
                編輯
              </Link>
              <DeletePurchaseButton purchaseId={purchase.id} supplier={purchase.supplier} />
            </>
          )}
        </div>
      </header>
      <section className={`${cardClass} space-y-3`}>
        <ul className="space-y-3">
          {purchase.lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{line.label}</p>
                <p className="text-muted">
                  {line.quantity} × {formatMoney(line.unitPrice, purchase.currency)}
                </p>
              </div>
              <p className="font-semibold">{formatMoney(line.quantity * line.unitPrice, purchase.currency)}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line pt-3 text-sm">
          <p>商品合計 {formatMoney(purchase.goods, purchase.currency)}</p>
          <p>運費 {formatMoney(purchase.shippingFee, purchase.currency)}</p>
          <p>其他費用 {formatMoney(purchase.otherFees, purchase.currency)}</p>
          <p className="text-base font-bold">總計 {formatMoney(purchase.total, purchase.currency)}</p>
        </div>
        {purchase.linked ? (
          <p className="text-sm">
            相關任務：
            <Link href={`/orders/${purchase.linked.id}`} className="font-medium text-sea">
              {purchase.linked.productName}
            </Link>
          </p>
        ) : null}
        {purchase.notes ? <p className="whitespace-pre-wrap text-sm leading-6 text-muted">{purchase.notes}</p> : null}
        {purchase.sourceSubject || purchase.sourceRef ? (
          <p className="text-sm leading-6 text-muted">
            信件：{purchase.sourceSubject || "（沒有主旨）"}
            {purchase.sourceRef ? ` · ${purchase.sourceRef}` : ""}
          </p>
        ) : null}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">訂單截圖</h2>
        {purchase.files.length === 0 ? <p className="text-sm text-muted">還沒有訂單截圖。</p> : null}
        <div className="grid grid-cols-2 gap-3">
          {purchase.files.map((file) => (
            <a key={file.id} href={`/api/files/${file.id}`} className="overflow-hidden rounded-2xl border border-line bg-white">
              {file.mimeType.startsWith("image/") ? (
                <img src={`/api/files/${file.id}`} alt={file.fileName} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <span className="flex aspect-[4/3] items-center justify-center bg-sea-soft text-sm font-medium text-sea">開啟 PDF</span>
              )}
              <span className="block truncate px-2 py-2 text-xs text-muted">{file.fileName}</span>
            </a>
          ))}
        </div>
      </section>
      <section className={`${cardClass} space-y-3`}>
        <h2 className="text-base font-semibold">異動紀錄</h2>
        {purchase.audit.length === 0 ? <p className="text-sm text-muted">還沒有異動紀錄。</p> : null}
        <ol className="space-y-3">
          {purchase.audit.map((entry) => (
            <li key={entry.id}>
              <p className="text-sm leading-6">{entry.summary}</p>
              <p className="text-xs text-muted">
                {entry.actorLabel} · {formatDateTime(entry.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
