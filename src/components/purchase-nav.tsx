import Link from "next/link";

const LINKS = [
  { href: "/purchases", label: "進貨單" },
  { href: "/purchases/new", label: "新增" },
  { href: "/purchases/skus", label: "商品" },
  { href: "/purchases/report", label: "累計買入" },
];

export function PurchaseNav({ current }: { current: string }) {
  return (
    <nav aria-label="進貨" className="flex gap-2 overflow-x-auto pb-1">
      {LINKS.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-3 text-sm font-medium ${
              active ? "bg-brand text-white" : "bg-white text-ink"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
