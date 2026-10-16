import type { Currency } from "./types";

export type MoneyBag = Record<Currency, number>;

export type SummaryOrder = {
  helperId: string;
  helperName: string;
  orderDate: string;
  orderAmount: number;
  orderCurrency: Currency;
  paid: boolean;
  paidAmount: number | null;
  paidCurrency: Currency | null;
  shippingCost: number | null;
  shippingCurrency: Currency | null;
  shippingReimbursed: boolean;
};

export type MonthHelperRow = {
  month: string;
  helperId: string;
  helperName: string;
  goodsOwed: MoneyBag;
  goodsPaid: MoneyBag;
  shippingOwed: MoneyBag;
  shippingPaid: MoneyBag;
};

export function emptyBag(): MoneyBag {
  return { JPY: 0, TWD: 0 };
}

export function bagHasValue(bag: MoneyBag) {
  return bag.JPY !== 0 || bag.TWD !== 0;
}

function add(bag: MoneyBag, currency: Currency, amount: number) {
  bag[currency] += amount;
}

export function summarize(orders: SummaryOrder[]): MonthHelperRow[] {
  const rows = new Map<string, MonthHelperRow>();

  for (const order of orders) {
    const month = order.orderDate.slice(0, 7);
    const key = `${month}:${order.helperId}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        month,
        helperId: order.helperId,
        helperName: order.helperName,
        goodsOwed: emptyBag(),
        goodsPaid: emptyBag(),
        shippingOwed: emptyBag(),
        shippingPaid: emptyBag(),
      };
      rows.set(key, row);
    }

    if (order.paid) {
      add(row.goodsPaid, order.paidCurrency ?? order.orderCurrency, order.paidAmount ?? order.orderAmount);
    } else {
      add(row.goodsOwed, order.orderCurrency, order.orderAmount);
    }

    if (order.shippingCost != null) {
      const currency = order.shippingCurrency ?? order.orderCurrency;
      if (order.shippingReimbursed) add(row.shippingPaid, currency, order.shippingCost);
      else add(row.shippingOwed, currency, order.shippingCost);
    }
  }

  return [...rows.values()].sort(
    (a, b) => b.month.localeCompare(a.month) || a.helperName.localeCompare(b.helperName, "zh-Hant"),
  );
}

export function sumRows(rows: MonthHelperRow[]) {
  const total: Pick<MonthHelperRow, "goodsOwed" | "goodsPaid" | "shippingOwed" | "shippingPaid"> = {
    goodsOwed: emptyBag(),
    goodsPaid: emptyBag(),
    shippingOwed: emptyBag(),
    shippingPaid: emptyBag(),
  };
  for (const row of rows) {
    total.goodsOwed.JPY += row.goodsOwed.JPY;
    total.goodsOwed.TWD += row.goodsOwed.TWD;
    total.goodsPaid.JPY += row.goodsPaid.JPY;
    total.goodsPaid.TWD += row.goodsPaid.TWD;
    total.shippingOwed.JPY += row.shippingOwed.JPY;
    total.shippingOwed.TWD += row.shippingOwed.TWD;
    total.shippingPaid.JPY += row.shippingPaid.JPY;
    total.shippingPaid.TWD += row.shippingPaid.TWD;
  }
  return total;
}
