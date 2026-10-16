import type { Metadata } from "next";
import { issuePasswordReset, updateHelperRole } from "@/actions/admin";
import { getDb } from "@/db";
import { listUsers } from "@/db/users";
import { Notice } from "@/components/notice";
import { cardClass, inputClass, secondaryButtonClass } from "@/components/styles";
import { roleLabel } from "@/lib/auth-policy";
import { requireUser } from "@/lib/current-user";
import { loginMethodLabel, resetUrl } from "@/lib/email";
import { isSafeId } from "@/lib/format";
import { smtpConfig } from "@/lib/smtp";
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
  const resetTokenRaw = one(params.resetToken) ?? "";
  const resetToken = /^[A-Za-z0-9_-]{20,128}$/.test(resetTokenRaw) ? resetTokenRaw : "";
  const resetFor = one(params.resetFor) ?? "";
  const resetPerson = isSafeId(resetFor) ? people.find((person) => person.id === resetFor) : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">小幫手</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          新的 LINE 或電子郵件帳號會先停在待核准。核准後才看得到自己的訂單、才能新增。
        </p>
        {user.lineUserId ? <p className="mt-2 text-xs text-muted">你的 LINE ID：{user.lineUserId}</p> : null}
        {user.email ? <p className="mt-1 text-xs text-muted">你的電子郵件：{user.email}</p> : null}
      </div>
      <Notice code={one(params.notice)} />
      {resetToken ? (
        <section className={`${cardClass} space-y-2`}>
          <h2 className="text-base font-semibold">一次性重設連結{resetPerson ? `：${resetPerson.displayName}` : ""}</h2>
          <p className="text-sm leading-6 text-muted">一個小時內有效，用過就失效。請點下面的連結，或把網址、代碼用 LINE 傳給對方。不要貼到公開的地方。</p>
          <a href={resetUrl(resetToken)} className="block break-all text-sm font-medium text-sea underline">
            {resetUrl(resetToken)}
          </a>
          <label className="block text-xs text-muted">
            代碼
            <input readOnly value={resetToken} aria-label="重設代碼" className={inputClass} />
          </label>
        </section>
      ) : null}
      {pending.length === 0 ? <p className="text-sm text-muted">目前沒有人在等核准。</p> : null}
      <p className="text-xs leading-5 text-muted">
        {smtpConfig()
          ? "已設定寄信。產生重設連結時也會寄到對方的信箱，頁面上仍會顯示連結。"
          : "目前沒有設定寄信。產生重設連結後，請自己傳給對方。"}
      </p>
      <ul className="space-y-3">
        {people.map((person) => (
          <li key={person.id} className={`${cardClass} space-y-3`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">{person.displayName}</p>
                <p className="text-xs text-muted">登入方式：{loginMethodLabel(person)}</p>
                {person.email ? <p className="break-all text-xs text-muted">{person.email}</p> : null}
                {person.lineUserId ? <p className="break-all text-xs text-muted">LINE {person.lineUserId}</p> : null}
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
            {person.email ? (
              <form action={issuePasswordReset}>
                <input type="hidden" name="userId" value={person.id} />
                <button type="submit" className={`${secondaryButtonClass} w-full`}>
                  產生重設連結
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
