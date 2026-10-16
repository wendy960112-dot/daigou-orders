import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "等待核准" };

export default async function PendingPage() {
  const user = await requireUser();
  return (
    <div className="space-y-3 pt-6">
      <h1 className="text-2xl font-bold">等溫蒂核准</h1>
      <p className="text-sm leading-7 text-muted">
        {user.displayName}，你已經登入了。溫蒂核准之後，重新整理就能建立訂單、看自己的代購單。
      </p>
      {user.lineUserId ? (
        <p className="rounded-2xl bg-card px-4 py-3 text-sm leading-6">
          你的 LINE ID
          <br />
          <span className="font-semibold break-all">{user.lineUserId}</span>
        </p>
      ) : null}
      <Link href="/pending" className="inline-flex min-h-11 items-center text-sm font-medium text-brand">
        重新檢查
      </Link>
    </div>
  );
}
