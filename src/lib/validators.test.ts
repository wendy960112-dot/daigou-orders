import { describe, expect, it } from "vitest";
import { makeReceiptPng } from "./png";
import { filesFromForm, orderProofMessage, sniffMime } from "./uploads";
import { parseFulfillForm, parseOrderForm, parsePaidFields } from "./validators";

function orderForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const values = {
    productName: "收納盒",
    productLinks: "https://example.com/a\nhttps://example.com/b",
    quantity: "2",
    orderAmount: "2480",
    orderCurrency: "JPY",
    orderDate: "2026-10-03",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("parseOrderForm", () => {
  it("accepts a helper order and drops a blank shipping cost", () => {
    const parsed = parseOrderForm(orderForm({ shippingCost: "", notes: "  急件  " }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.productLinks).toBe("https://example.com/a\nhttps://example.com/b");
    expect(parsed.data.shippingCost).toBeNull();
    expect(parsed.data.shippingCurrency).toBeNull();
    expect(parsed.data.notes).toBe("急件");
  });

  it("rejects missing links, bad dates, and decimal amounts", () => {
    expect(parseOrderForm(orderForm({ productLinks: "  \n" })).ok).toBe(false);
    expect(parseOrderForm(orderForm({ orderDate: "2026-02-31" })).ok).toBe(false);
    expect(parseOrderForm(orderForm({ orderAmount: "12.5" })).ok).toBe(false);
    expect(parseOrderForm(orderForm({ quantity: "0" })).ok).toBe(false);
  });
});

describe("parsePaidFields", () => {
  it("clears payment fields when the checkbox is off", () => {
    const form = new FormData();
    form.set("paidAmount", "100");
    form.set("goodsReceived", "on");
    const parsed = parsePaidFields(form);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.paid).toBe(false);
    expect(parsed.data.paidAmount).toBeNull();
    expect(parsed.data.goodsReceived).toBe(true);
  });
});

describe("parseFulfillForm", () => {
  it("fixes the carrier to EMS and leaves tracking optional", () => {
    const form = new FormData();
    form.set("productOptionId", "product_marukyu");
    form.set("orderAmount", "3200");
    form.set("orderCurrency", "JPY");
    form.set("orderDate", "2026-10-16");
    form.set("carrier", "Yamato");
    const blank = parseFulfillForm(form);
    expect(blank.ok).toBe(true);
    if (!blank.ok) return;
    expect(blank.data.carrier).toBe("EMS");
    expect(blank.data.trackingNumber).toBeNull();

    form.set("trackingNumber", " EE123456789JP ");
    const filled = parseFulfillForm(form);
    expect(filled.ok).toBe(true);
    if (!filled.ok) return;
    expect(filled.data.trackingNumber).toBe("EE123456789JP");
    expect(filled.data.carrier).toBe("EMS");
  });
});

describe("order screenshots", () => {
  it("requires at least one order screenshot", () => {
    expect(orderProofMessage(0, 0)).toBe("請上傳訂單截圖。");
    expect(orderProofMessage(1, 0)).toBeNull();
    expect(orderProofMessage(8, 1)).toBe("訂單截圖最多 8 個。");
  });
});

describe("uploads", () => {
  it("sniffs png and pdf and rejects plain text", async () => {
    const png = makeReceiptPng({ heading: "ORDER", lines: ["TEST"], accent: [154, 52, 18] });
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(sniffMime(png)).toBe("image/png");
    expect(sniffMime(Buffer.from("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffMime(Buffer.from("hello"))).toBeNull();

    const form = new FormData();
    form.append("orderProofs", new File([new Uint8Array(png)], "截圖.png", { type: "image/png" }));
    form.append("orderProofs", new File([Buffer.from("<html></html>")], "x.html", { type: "text/html" }));
    const result = await filesFromForm(form, "orderProofs", "order_proof");
    expect(result.ok).toBe(false);
  });
});
