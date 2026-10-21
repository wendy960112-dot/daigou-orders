import { getDb } from "@/db";
import { reportToCsv, skuSpendReport } from "@/db/purchases";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return new Response("找不到頁面", { status: 404 });
  const url = new URL(request.url);
  const csv = reportToCsv(skuSpendReport(getDb(), user, { from: url.searchParams.get("from"), to: url.searchParams.get("to") }));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=sku-purchases.csv",
    },
  });
}
