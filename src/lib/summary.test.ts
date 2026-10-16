import { describe, expect, it } from "vitest";
import { emptyBag, summarize, sumRows, type SummaryOrder } from "./summary";

function order(partial: Partial<SummaryOrder> & Pick<SummaryOrder, "helperId" | "orderCurrency" | "orderAmount" | "orderDate">): SummaryOrder {
  return {
    helperName: partial.helperId,
    paid: false,
    paidAmount: null,
    paidCurrency: null,
    shippingCost: null,
    shippingCurrency: null,
    shippingReimbursed: false,
    ...partial,
  };
}

describe("summarize", () => {
  it("keeps currencies separate and does not convert a TWD payment of a JPY order", () => {
    const rows = summarize([
      order({
        helperId: "ken",
        helperName: "阿健",
        orderDate: "2026-10-08",
        orderAmount: 6480,
        orderCurrency: "JPY",
        paid: true,
        paidAmount: 1450,
        paidCurrency: "TWD",
      }),
      order({
        helperId: "mei",
        helperName: "小美",
        orderDate: "2026-10-03",
        orderAmount: 1620,
        orderCurrency: "JPY",
      }),
    ]);

    const ken = rows.find((row) => row.helperId === "ken");
    const mei = rows.find((row) => row.helperId === "mei");
    expect(ken?.goodsPaid).toEqual({ JPY: 0, TWD: 1450 });
    expect(ken?.goodsOwed).toEqual(emptyBag());
    expect(mei?.goodsOwed).toEqual({ JPY: 1620, TWD: 0 });
    expect(mei?.goodsPaid).toEqual(emptyBag());
  });

  it("counts unpaid shipping until it is reimbursed, in the shipping currency", () => {
    const rows = summarize([
      order({
        helperId: "ken",
        helperName: "阿健",
        orderDate: "2026-10-12",
        orderAmount: 890,
        orderCurrency: "TWD",
        shippingCost: 220,
        shippingCurrency: "TWD",
        shippingReimbursed: false,
      }),
    ]);
    expect(rows[0].shippingOwed.TWD).toBe(220);
    expect(rows[0].shippingPaid.TWD).toBe(0);
    expect(sumRows(rows).goodsOwed.TWD).toBe(890);
  });
});
