"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

export function BottomNav({ role }: { role: Role }) {
  const path = usePathname();
  if (role === "pending") return null;

  const items: { href: string; label: string; active: boolean }[] = [
    { href: "/", label: "訂單", active: path === "/" || (path.startsWith("/orders/") && path !== "/orders/new") },
    { href: "/orders/new", label: "新增", active: path === "/orders/new" },
  ];
  if (role === "admin") {
    items.push({ href: "/summary", label: "彙總", active: path.startsWith("/summary") });
    items.push({ href: "/helpers", label: "幫手", active: path.startsWith("/helpers") });
  }

  return (
    <nav
      aria-label="主要選單"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-3xl pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-14 flex-1 items-center justify-center text-sm font-medium ${
              item.active ? "text-brand" : "text-muted"
            }`}
            aria-current={item.active ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
