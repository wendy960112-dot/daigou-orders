import { formatMoney } from "@/lib/format";
import type { MoneyBag } from "@/lib/summary";

export function MoneyLines({ bag }: { bag: MoneyBag }) {
  const parts = (["JPY", "TWD"] as const).filter((currency) => bag[currency] !== 0);
  if (parts.length === 0) return <span className="text-muted">—</span>;
  return <span className="font-semibold">{parts.map((currency) => formatMoney(bag[currency], currency)).join("、")}</span>;
}
