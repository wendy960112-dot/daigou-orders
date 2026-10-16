export type Role = "admin" | "helper" | "pending";
export type Currency = "JPY" | "TWD";
export type AttachmentKind = "order_proof" | "shipping_receipt" | "payment_proof" | "reimbursement_proof";

export type ActionState = { ok: true; message: string } | { ok: false; message: string };

export const initialActionState: ActionState = { ok: true, message: "" };

export type OrderInput = {
  helperId: string;
  productName: string;
  productLinks: string;
  quantity: number;
  orderAmount: number;
  orderCurrency: Currency;
  orderDate: string;
  expectedArrivalDate: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  shipDate: string | null;
  shippingCost: number | null;
  shippingCurrency: Currency | null;
  notes: string | null;
};

export type Viewer = { id: string; role: Role };
