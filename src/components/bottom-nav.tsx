"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

export function BottomNav({ role, inboxCount = 0 }: { role: Role; inboxCount?: number }) {
  const path = usePathname();
  if (role === "pending") return null;

  const items: { href: string; label: string; active: boolean; badge: number }[] = [
    { href: "/", label: "訂單", active: path === "/" || (path.startsWith("/orders/") && path !== "/orders/new"), badge: 0 },
  ];
  if (role === "admin") {
    items.push({ href: "/orders/new", label: "發任務", active: path === "/orders/new", badge: 0 });
    items.push({ href: "/summary", label: "彙總", active: path.startsWith("/summary"), badge: 0 });
    items.push({ href: "/helpers", label: "幫手", active: path.startsWith("/helpers"), badge: 0 });
  } else {
    items.push({ href: "/inbox", label: "接收新單", active: path.startsWith("/inbox"), badge: inboxCount });
  }

  return (
    <nav aria-label="主要選單" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-14 flex-1 items-center justify-center gap-1 text-sm font-medium ${
              item.active ? "text-brand" : "text-muted"
            }`}
            aria-current={item.active ? "page" : undefined}
            aria-label={item.badge > 0 ? `${item.label}，${item.badge} 張新任務` : undefined}
          >
            {item.label}
            {item.badge > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold leading-5 text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
