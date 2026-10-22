import { getDb } from "@/db";
import { searchSkus } from "@/db/skus";
import { purchasingDenied } from "@/lib/purchasing-auth";
import { skuLabel } from "@/lib/sku-csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = purchasingDenied(request);
  if (denied) return denied;
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const rows = searchSkus(getDb(), q, 20).map((sku) => ({
    id: sku.id,
    code: sku.code,
    name: sku.name,
    variant: sku.variant,
    category: sku.category,
    subcategory: sku.subcategory,
    salePrice: sku.salePrice,
    cost: sku.cost,
    label: skuLabel(sku),
  }));
  return Response.json({ skus: rows });
}
