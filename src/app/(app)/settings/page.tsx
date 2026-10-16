import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { addProduct, renameProduct, toggleProduct } from "@/actions/products";
import { Notice } from "@/components/notice";
import { cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/styles";
import { getDb } from "@/db";
import { listProductOptions } from "@/db/products";
import { requireUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "商品名稱" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const query = await searchParams;
  const options = listProductOptions(getDb());

  return (
    <div className="space-y-4">
      <Link href="/orders/new" className="text-sm font-medium text-sea">
        ← 回發任務
      </Link>
      <div>
        <h1 className="text-2xl font-bold">商品名稱</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          發任務和回報下單時的下拉選單用這份名單。停用後不能再派新任務，已經寫在訂單上的名稱不會改掉。
        </p>
      </div>
      <Notice code={one(query.notice)} />

      <form action={addProduct} className={`${cardClass} space-y-3`}>
        <label className="block text-sm font-medium">
          新增商品名稱
          <input name="name" required maxLength={80} className={inputClass} placeholder="丸久小山園" />
        </label>
        <button type="submit" className={`${primaryButtonClass} w-full`}>
          新增
        </button>
      </form>

      <ul className="space-y-3">
        {options.map((option) => (
          <li key={option.id} className={`${cardClass} space-y-3`}>
            <form action={renameProduct} className="space-y-3">
              <input type="hidden" name="id" value={option.id} />
              <label className="block text-sm font-medium">
                名稱
                <input name="name" required maxLength={80} defaultValue={option.name} className={inputClass} />
              </label>
              <button type="submit" className={`${secondaryButtonClass} w-full`}>
                儲存名稱
              </button>
            </form>
            <form action={toggleProduct}>
              <input type="hidden" name="id" value={option.id} />
              <input type="hidden" name="active" value={option.active ? "0" : "1"} />
              <button type="submit" className={`${secondaryButtonClass} w-full`}>
                {option.active ? "停用" : "重新啟用"}
              </button>
            </form>
            <p className={`text-xs ${option.active ? "text-good" : "text-muted"}`}>{option.active ? "使用中" : "已停用"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
