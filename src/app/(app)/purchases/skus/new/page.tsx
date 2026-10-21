import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SkuEditor } from "@/components/sku-editor";
import { requireUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "新增商品" };

export default async function NewSkuPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return (
    <div className="space-y-4">
      <Link href="/purchases/skus" className="text-sm font-medium text-sea">
        ← 回商品
      </Link>
      <h1 className="text-2xl font-bold">新增商品</h1>
      <SkuEditor />
    </div>
  );
}
