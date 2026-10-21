import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { archiveSkuAction } from "@/actions/purchases";
import { Notice } from "@/components/notice";
import { SkuEditor } from "@/components/sku-editor";
import { secondaryButtonClass } from "@/components/styles";
import { getDb } from "@/db";
import { getSku } from "@/db/skus";
import { requireUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "編輯商品" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EditSkuPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const { id } = await params;
  const sku = getSku(getDb(), user, id);
  if (!sku) notFound();
  const query = await searchParams;

  return (
    <div className="space-y-4">
      <Link href="/purchases/skus" className="text-sm font-medium text-sea">
        ← 回商品
      </Link>
      <Notice code={one(query.notice)} />
      <h1 className="text-2xl font-bold">編輯商品</h1>
      {sku.archivedAt ? <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">這個商品已封存，新的進貨單不能選它。</p> : null}
      <SkuEditor sku={sku} />
      <form action={archiveSkuAction}>
        <input type="hidden" name="skuId" value={sku.id} />
        <input type="hidden" name="archived" value={sku.archivedAt ? "0" : "1"} />
        <button type="submit" className={`${secondaryButtonClass} w-full`}>
          {sku.archivedAt ? "取消封存" : "封存這個商品"}
        </button>
      </form>
    </div>
  );
}
