import { isRealDate, isSafeId } from "./format";
import { DEFAULT_CARRIER, isDeliveryMethod, type DeliveryMethod } from "./tasks";
import type { Currency, OrderInput } from "./types";

function fail(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

function readString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function parseRequiredDate(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return fail(`請填${label}`);
  if (!isRealDate(trimmed)) return fail(`${label}不正確`);
  return { ok: true as const, value: trimmed };
}

function parseOptionalDate(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true as const, value: null };
  if (!isRealDate(trimmed)) return fail(`${label}不正確`);
  return { ok: true as const, value: trimmed };
}

function parseRequiredAmount(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return fail(`請填${label}`);
  if (!/^\d+$/.test(trimmed)) return fail(`${label}請填 0 以上的整數，不要加小數點或錢字號`);
  const amount = Number(trimmed);
  if (amount > 100_000_000) return fail(`${label}太大了`);
  return { ok: true as const, value: amount };
}

function parseOptionalAmount(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true as const, value: null };
  return parseRequiredAmount(trimmed, label);
}

function parseCurrency(value: string): { ok: true; value: Currency } | { ok: false; message: string } {
  if (value === "JPY" || value === "TWD") return { ok: true, value };
  return fail("請選擇日圓或新台幣");
}

function cleanText(value: string, max: number, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true as const, value: null };
  if (trimmed.length > max) return fail(`${label}太長`);
  return { ok: true as const, value: trimmed };
}

export function parseOrderForm(
  form: FormData,
): { ok: true; data: Omit<OrderInput, "helperId"> } | { ok: false; message: string } {
  const productName = readString(form, "productName").trim();
  if (!productName) return fail("請填商品名稱");
  if (productName.length > 200) return fail("商品名稱太長");

  const links = readString(form, "productLinks")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (links.length === 0) return fail("請貼上至少一個商品連結");
  if (links.length > 20) return fail("商品連結太多了，請分成兩筆訂單");
  if (links.some((link) => link.length > 2000)) return fail("有一條商品連結太長");

  const quantityText = readString(form, "quantity").trim();
  if (!/^\d+$/.test(quantityText)) return fail("數量請填 1 以上的整數");
  const quantity = Number(quantityText);
  if (quantity < 1 || quantity > 9999) return fail("數量請填 1 到 9999");

  const orderAmount = parseRequiredAmount(readString(form, "orderAmount"), "訂購金額");
  if (!orderAmount.ok) return orderAmount;
  const orderCurrency = parseCurrency(readString(form, "orderCurrency"));
  if (!orderCurrency.ok) return orderCurrency;
  const orderDate = parseRequiredDate(readString(form, "orderDate"), "訂購日期");
  if (!orderDate.ok) return orderDate;
  const expectedArrivalDate = parseOptionalDate(readString(form, "expectedArrivalDate"), "預計到貨日");
  if (!expectedArrivalDate.ok) return expectedArrivalDate;
  const carrier = cleanText(readString(form, "carrier"), 100, "物流公司");
  if (!carrier.ok) return carrier;
  const trackingNumber = cleanText(readString(form, "trackingNumber"), 100, "追蹤單號");
  if (!trackingNumber.ok) return trackingNumber;
  const shipDate = parseOptionalDate(readString(form, "shipDate"), "寄出日期");
  if (!shipDate.ok) return shipDate;
  const shippingCost = parseOptionalAmount(readString(form, "shippingCost"), "運費");
  if (!shippingCost.ok) return shippingCost;

  let shippingCurrency: Currency | null = null;
  if (shippingCost.value != null) {
    const parsed = parseCurrency(readString(form, "shippingCurrency") || orderCurrency.value);
    if (!parsed.ok) return parsed;
    shippingCurrency = parsed.value;
  }

  const notes = cleanText(readString(form, "notes"), 4000, "備註");
  if (!notes.ok) return notes;

  return {
    ok: true,
    data: {
      productName,
      productLinks: links.join("\n"),
      quantity,
      orderAmount: orderAmount.value,
      orderCurrency: orderCurrency.value,
      orderDate: orderDate.value,
      expectedArrivalDate: expectedArrivalDate.value,
      carrier: carrier.value,
      trackingNumber: trackingNumber.value,
      shipDate: shipDate.value,
      shippingCost: shippingCost.value,
      shippingCurrency,
      notes: notes.value,
    },
  };
}

export type DispatchFields = {
  productOptionId: string;
  productLinks: string;
  purchaseNote: string;
  dispatchedOn: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
};

export function parseDispatchForm(form: FormData): { ok: true; data: DispatchFields } | { ok: false; message: string } {
  const productOptionId = readString(form, "productOptionId").trim();
  if (!isSafeId(productOptionId)) return fail("請選擇商品名稱");

  const links = readString(form, "productLinks")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (links.length === 0) return fail("請貼上至少一個商品連結");
  if (links.length > 20) return fail("商品連結太多了，請分成兩筆任務");
  if (links.some((link) => link.length > 2000)) return fail("有一條商品連結太長");

  const purchaseNote = readString(form, "purchaseNote").trim();
  if (!purchaseNote) return fail("請填下單內容");
  if (purchaseNote.length > 4000) return fail("下單內容太長");

  const dispatchedOn = parseRequiredDate(readString(form, "dispatchedOn"), "派發日期");
  if (!dispatchedOn.ok) return dispatchedOn;

  const deliveryRaw = readString(form, "deliveryMethod");
  if (!isDeliveryMethod(deliveryRaw)) return fail("請選擇交貨形式");
  const address = cleanText(readString(form, "deliveryAddress"), 500, "指定地址");
  if (!address.ok) return address;
  if (deliveryRaw === "ship_address" && !address.value) return fail("請填指定地址");

  return {
    ok: true,
    data: {
      productOptionId,
      productLinks: links.join("\n"),
      purchaseNote,
      dispatchedOn: dispatchedOn.value,
      deliveryMethod: deliveryRaw,
      deliveryAddress: deliveryRaw === "ship_address" ? address.value : null,
    },
  };
}

export type FulfillFields = {
  productOptionId: string;
  orderAmount: number;
  orderCurrency: Currency;
  orderDate: string;
  carrier: string | null;
  trackingNumber: string | null;
  shipDate: string | null;
  shippingCost: number | null;
  shippingCurrency: Currency | null;
  notes: string | null;
};

export function parseFulfillForm(form: FormData): { ok: true; data: FulfillFields } | { ok: false; message: string } {
  const productOptionId = readString(form, "productOptionId").trim();
  if (!isSafeId(productOptionId)) return fail("請選擇商品名稱");
  const orderAmount = parseRequiredAmount(readString(form, "orderAmount"), "訂購金額");
  if (!orderAmount.ok) return orderAmount;
  const orderCurrency = parseCurrency(readString(form, "orderCurrency"));
  if (!orderCurrency.ok) return orderCurrency;
  const orderDate = parseRequiredDate(readString(form, "orderDate"), "訂購日期");
  if (!orderDate.ok) return orderDate;
  const trackingNumber = cleanText(readString(form, "trackingNumber"), 100, "追蹤單號");
  if (!trackingNumber.ok) return trackingNumber;
  const shipDate = parseOptionalDate(readString(form, "shipDate"), "寄出日期");
  if (!shipDate.ok) return shipDate;
  const shippingCost = parseOptionalAmount(readString(form, "shippingCost"), "運費");
  if (!shippingCost.ok) return shippingCost;
  let shippingCurrency: Currency | null = null;
  if (shippingCost.value != null) {
    const parsed = parseCurrency(readString(form, "shippingCurrency") || orderCurrency.value);
    if (!parsed.ok) return parsed;
    shippingCurrency = parsed.value;
  }
  const notes = cleanText(readString(form, "notes"), 4000, "備註");
  if (!notes.ok) return notes;
  return {
    ok: true,
    data: {
      productOptionId,
      orderAmount: orderAmount.value,
      orderCurrency: orderCurrency.value,
      orderDate: orderDate.value,
      carrier: DEFAULT_CARRIER,
      trackingNumber: trackingNumber.value,
      shipDate: shipDate.value,
      shippingCost: shippingCost.value,
      shippingCurrency,
      notes: notes.value,
    },
  };
}

export function parsePaidFields(form: FormData) {
  const paid = form.get("paid") === "on";
  const goodsReceived = form.get("goodsReceived") === "on";
  const shippingReimbursed = form.get("shippingReimbursed") === "on";

  if (!paid) {
    return { ok: true as const, data: { paid, paidAt: null, paidAmount: null, paidCurrency: null, goodsReceived, shippingReimbursed } };
  }

  const paidAtRaw = readString(form, "paidAt");
  const paidAt = paidAtRaw.trim() ? parseRequiredDate(paidAtRaw, "匯款日期") : { ok: true as const, value: null };
  if (!paidAt.ok) return paidAt;

  const amountRaw = readString(form, "paidAmount");
  const paidAmount = amountRaw.trim() ? parseRequiredAmount(amountRaw, "匯款金額") : { ok: true as const, value: null };
  if (!paidAmount.ok) return paidAmount;

  const currencyRaw = readString(form, "paidCurrency");
  let paidCurrency: Currency | null = null;
  if (currencyRaw) {
    const parsed = parseCurrency(currencyRaw);
    if (!parsed.ok) return parsed;
    paidCurrency = parsed.value;
  }

  return {
    ok: true as const,
    data: {
      paid,
      paidAt: paidAt.value,
      paidAmount: paidAmount.value,
      paidCurrency,
      goodsReceived,
      shippingReimbursed,
    },
  };
}
