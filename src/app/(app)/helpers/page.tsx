import type { Metadata } from "next";
import { updateHelperRole } from "@/actions/admin";
import { getDb } from "@/db";
import { listUsers } from "@/db/users";
import { Notice } from "@/components/notice";
import { cardClass, secondaryButtonClass } from "@/components/styles";
import { roleLabel } from "@/lib/auth-policy";
import { requireUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "小幫手" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HelpersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const params = await searchParams;
  const people = listUsers(getDb());
  const pending = people.filter((person) => person.role === "pending");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">小幫手</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          新的 LINE 帳號會先停在待核准。核准後才看得到自己的訂單、才能新增。
        </p>
        {user.lineUserId ? <p className="mt-2 text-xs text-muted">你的 LINE ID：{user.lineUserId}</p> : null}
      </div>
      <Notice code={one(params.notice)} />
      {pending.length === 0 ? <p className="text-sm text-muted">目前沒有人在等核准。</p> : null}
      <ul className="space-y-3">
        {people.map((person) => (
          <li key={person.id} className={`${cardClass} space-y-3`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">{person.displayName}</p>
                <p className="text-xs text-muted">{person.lineUserId ?? "開發用帳號"}</p>
              </div>
              <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium">{roleLabel(person.role)}</span>
            </div>
            {person.id !== user.id && person.role !== "admin" ? (
              <form action={updateHelperRole}>
                <input type="hidden" name="userId" value={person.id} />
                <input type="hidden" name="role" value={person.role === "helper" ? "pending" : "helper"} />
                <button type="submit" className={`${secondaryButtonClass} w-full`}>
                  {person.role === "helper" ? "改回待核准" : "核准為小幫手"}
                </button>
              </form>
            ) : null}
            {person.role === "admin" && person.id !== user.id ? (
              <form action={updateHelperRole}>
                <input type="hidden" name="userId" value={person.id} />
                <input type="hidden" name="role" value="helper" />
                <button type="submit" className={`${secondaryButtonClass} w-full`}>
                  改為小幫手
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
