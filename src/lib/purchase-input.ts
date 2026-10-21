import { isRealDate, isSafeId } from "./format";
import type { Currency } from "./types";

export type PurchaseLineInput = { skuId: string; quantity: number; unitPrice: number };

export type PurchaseDraft = {
  purchasedOn: string;
  supplier: string;
  currency: Currency;
  orderId: string | null;
  shippingFee: number;
  otherFees: number;
  notes: string | null;
  sourceRef: string | null;
  sourceSubject: string | null;
  lines: PurchaseLineInput[];
};

function fail(message: string) {
  return { ok: false as const, message };
}

function money(value: unknown, label: string, required: boolean) {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!text) return required ? fail(`請填${label}`) : { ok: true as const, value: 0 };
  if (!/^\d+$/.test(text)) return fail(`${label}請填 0 以上的整數`);
  const amount = Number(text);
  if (amount > 100_000_000) return fail(`${label}太大了`);
  return { ok: true as const, value: amount };
}

function clean(value: unknown, max: number) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (text.length > max) return false as const;
  return text;
}

export function parsePurchaseDraft(input: {
  purchasedOn?: unknown;
  supplier?: unknown;
  currency?: unknown;
  orderId?: unknown;
  shippingFee?: unknown;
  otherFees?: unknown;
  notes?: unknown;
  sourceRef?: unknown;
  sourceSubject?: unknown;
  lines?: unknown;
}): { ok: true; data: PurchaseDraft } | { ok: false; message: string } {
  const purchasedOn = typeof input.purchasedOn === "string" ? input.purchasedOn.trim() : "";
  if (!purchasedOn) return fail("請填進貨日期");
  if (!isRealDate(purchasedOn)) return fail("進貨日期不正確");
  const supplier = typeof input.supplier === "string" ? input.supplier.trim() : "";
  if (!supplier) return fail("請填供應商");
  if (supplier.length > 200) return fail("供應商太長");
  if (input.currency !== "JPY" && input.currency !== "TWD") return fail("請選擇日圓或新台幣");
  const orderRaw = typeof input.orderId === "string" ? input.orderId.trim() : "";
  if (orderRaw && !isSafeId(orderRaw)) return fail("相關任務不正確");
  const shipping = money(input.shippingFee, "運費", false);
  if (!shipping.ok) return shipping;
  const other = money(input.otherFees, "其他費用", false);
  if (!other.ok) return other;
  const notes = clean(input.notes, 4000);
  if (notes === false) return fail("備註太長");
  const sourceRef = clean(input.sourceRef, 200);
  if (sourceRef === false) return fail("信件編號太長");
  const sourceSubject = clean(input.sourceSubject, 300);
  if (sourceSubject === false) return fail("信件主旨太長");
  if (!Array.isArray(input.lines) || input.lines.length === 0) return fail("請至少加一項商品");
  if (input.lines.length > 40) return fail("一張進貨單最多 40 項");
  const lines: PurchaseLineInput[] = [];
  for (const line of input.lines) {
    const row = line && typeof line === "object" ? (line as Record<string, unknown>) : {};
    const skuId = typeof row.skuId === "string" ? row.skuId.trim() : "";
    if (!isSafeId(skuId)) return fail("請選擇商品");
    const quantity = money(row.quantity, "數量", true);
    if (!quantity.ok) return quantity;
    if (quantity.value < 1 || quantity.value > 99999) return fail("數量請填 1 到 99999");
    const unitPrice = money(row.unitPrice, "單價", true);
    if (!unitPrice.ok) return unitPrice;
    lines.push({ skuId, quantity: quantity.value, unitPrice: unitPrice.value });
  }
  return {
    ok: true,
    data: {
      purchasedOn,
      supplier,
      currency: input.currency,
      orderId: orderRaw || null,
      shippingFee: shipping.value,
      otherFees: other.value,
      notes,
      sourceRef,
      sourceSubject,
      lines,
    },
  };
}

export function parsePurchaseForm(form: FormData) {
  const skuIds = form.getAll("skuId").map((value) => (typeof value === "string" ? value.trim() : ""));
  const quantities = form.getAll("quantity").map((value) => (typeof value === "string" ? value : ""));
  const prices = form.getAll("unitPrice").map((value) => (typeof value === "string" ? value : ""));
  const lines = skuIds
    .map((skuId, index) => ({ skuId, quantity: quantities[index] ?? "", unitPrice: prices[index] ?? "" }))
    .filter((line) => line.skuId || line.quantity.trim() || line.unitPrice.trim());
  return parsePurchaseDraft({
    purchasedOn: form.get("purchasedOn"),
    supplier: form.get("supplier"),
    currency: form.get("currency"),
    orderId: form.get("orderId"),
    shippingFee: form.get("shippingFee"),
    otherFees: form.get("otherFees"),
    notes: form.get("notes"),
    sourceRef: form.get("sourceRef"),
    sourceSubject: form.get("sourceSubject"),
    lines,
  });
}

export function goodsTotal(lines: PurchaseLineInput[]) {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

export function purchaseTotal(lines: PurchaseLineInput[], shippingFee: number, otherFees: number) {
  return goodsTotal(lines) + shippingFee + otherFees;
}
