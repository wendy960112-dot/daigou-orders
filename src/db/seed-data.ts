import { eq } from "drizzle-orm";
import { DEMO_USERS } from "@/lib/demo-users";
import { makeReceiptPng } from "@/lib/png";
import { writeUpload } from "@/lib/uploads";
import { attachments, auditLogs, orders, users } from "./schema";
import type { AppDb } from "./types";

const STAMP = "2026-08-01T01:00:00.000Z";

function userRow(id: string, displayName: string, role: "admin" | "helper" | "pending") {
  return {
    id,
    lineUserId: null,
    displayName,
    pictureUrl: null,
    role,
    previewSandbox: false,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

export function insertDemoData(db: AppDb) {
  const wendy = DEMO_USERS[0];
  const mei = DEMO_USERS[1];
  const ken = DEMO_USERS[2];
  const lin = DEMO_USERS[3];

  db.insert(users)
    .values([
      userRow(wendy.id, wendy.displayName, wendy.role),
      userRow(mei.id, mei.displayName, mei.role),
      userRow(ken.id, ken.displayName, ken.role),
      userRow(lin.id, lin.displayName, lin.role),
    ])
    .run();

  db.insert(orders)
    .values([
      {
        id: "order_mei_aug",
        helperId: mei.id,
        productName: "象印保溫瓶",
        productLinks: "https://example.com/demo/zojirushi",
        quantity: 1,
        orderAmount: 9800,
        orderCurrency: "JPY",
        orderDate: "2026-08-02",
        expectedArrivalDate: "2026-08-12",
        carrier: "Yamato",
        trackingNumber: "YT880012345",
        shipDate: "2026-08-08",
        shippingCost: 1200,
        shippingCurrency: "JPY",
        notes: "這是示範訂單，連結不是真的商品。",
        paid: true,
        paidAt: "2026-08-05",
        paidAmount: 9800,
        paidCurrency: "JPY",
        goodsReceived: true,
        goodsReceivedAt: "2026-08-14T03:00:00.000Z",
        shippingReimbursed: true,
        shippingReimbursedAt: "2026-08-15T03:00:00.000Z",
        createdAt: "2026-08-02T02:00:00.000Z",
        updatedAt: "2026-08-15T03:00:00.000Z",
      },
      {
        id: "order_mei_sep",
        helperId: mei.id,
        productName: "無印良品 聚丙烯收納盒",
        productLinks: "https://example.com/demo/muji-box",
        quantity: 2,
        orderAmount: 2480,
        orderCurrency: "JPY",
        orderDate: "2026-09-18",
        expectedArrivalDate: "2026-09-28",
        carrier: "黑貓宅急便",
        trackingNumber: "1234-5678-9012",
        shipDate: "2026-09-22",
        shippingCost: 850,
        shippingCurrency: "JPY",
        notes: "這是示範訂單，連結不是真的商品。",
        paid: true,
        paidAt: "2026-09-20",
        paidAmount: 2480,
        paidCurrency: "JPY",
        goodsReceived: true,
        goodsReceivedAt: "2026-09-30T03:00:00.000Z",
        shippingReimbursed: true,
        shippingReimbursedAt: "2026-10-01T03:00:00.000Z",
        createdAt: "2026-09-18T02:00:00.000Z",
        updatedAt: "2026-10-01T03:00:00.000Z",
      },
      {
        id: "order_mei_oct",
        helperId: mei.id,
        productName: "白色戀人 24入",
        productLinks: "https://example.com/demo/shiroi-koibito",
        quantity: 1,
        orderAmount: 1620,
        orderCurrency: "JPY",
        orderDate: "2026-10-03",
        expectedArrivalDate: "2026-10-20",
        carrier: null,
        trackingNumber: null,
        shipDate: null,
        shippingCost: null,
        shippingCurrency: null,
        notes: "店家尚未出貨。這是示範訂單。",
        paid: false,
        paidAt: null,
        paidAmount: null,
        paidCurrency: null,
        goodsReceived: false,
        goodsReceivedAt: null,
        shippingReimbursed: false,
        shippingReimbursedAt: null,
        createdAt: "2026-10-03T02:00:00.000Z",
        updatedAt: "2026-10-03T02:00:00.000Z",
      },
      {
        id: "order_ken_mario",
        helperId: ken.id,
        productName: "瑪利歐派對 超級巨星",
        productLinks: "https://example.com/demo/mario-party",
        quantity: 1,
        orderAmount: 6480,
        orderCurrency: "JPY",
        orderDate: "2026-10-08",
        expectedArrivalDate: "2026-10-22",
        carrier: null,
        trackingNumber: null,
        shipDate: null,
        shippingCost: null,
        shippingCurrency: null,
        notes: "溫蒂用新台幣匯這筆日圓訂單。系統不會自動換算。",
        paid: true,
        paidAt: "2026-10-10",
        paidAmount: 1450,
        paidCurrency: "TWD",
        goodsReceived: false,
        goodsReceivedAt: null,
        shippingReimbursed: false,
        shippingReimbursedAt: null,
        createdAt: "2026-10-08T02:00:00.000Z",
        updatedAt: "2026-10-10T04:00:00.000Z",
      },
      {
        id: "order_ken_bottles",
        helperId: ken.id,
        productName: "無印良品 旅行分裝瓶組",
        productLinks: "https://example.com/demo/travel-bottles",
        quantity: 3,
        orderAmount: 890,
        orderCurrency: "TWD",
        orderDate: "2026-10-12",
        expectedArrivalDate: "2026-10-25",
        carrier: "日本郵便",
        trackingNumber: "JP4567890123",
        shipDate: "2026-10-14",
        shippingCost: 220,
        shippingCurrency: "TWD",
        notes: "已轉寄，運費收據在下面。這是示範訂單。",
        paid: false,
        paidAt: null,
        paidAmount: null,
        paidCurrency: null,
        goodsReceived: false,
        goodsReceivedAt: null,
        shippingReimbursed: false,
        shippingReimbursedAt: null,
        createdAt: "2026-10-12T02:00:00.000Z",
        updatedAt: "2026-10-14T02:00:00.000Z",
      },
    ])
    .run();

  const proof = makeReceiptPng({ heading: "ORDER", lines: ["MUJI BOX", "JPY 2,480", "2026-09-18"], accent: [154, 52, 18] });
  const receipt = makeReceiptPng({ heading: "RECEIPT", lines: ["SHIPPING", "JPY 850", "YAMATO"], accent: [15, 76, 92] });
  const kenReceipt = makeReceiptPng({ heading: "RECEIPT", lines: ["SHIPPING", "TWD 220", "JAPAN POST"], accent: [15, 76, 92] });
  writeUpload("file_mei_sep_proof", proof);
  writeUpload("file_mei_sep_receipt", receipt);
  writeUpload("file_ken_bottle_receipt", kenReceipt);

  db.insert(attachments)
    .values([
      {
        id: "file_mei_sep_proof",
        orderId: "order_mei_sep",
        kind: "order_proof",
        fileName: "訂單截圖.png",
        mimeType: "image/png",
        size: proof.length,
        createdAt: "2026-09-18T02:05:00.000Z",
      },
      {
        id: "file_mei_sep_receipt",
        orderId: "order_mei_sep",
        kind: "shipping_receipt",
        fileName: "運費收據.png",
        mimeType: "image/png",
        size: receipt.length,
        createdAt: "2026-09-22T02:05:00.000Z",
      },
      {
        id: "file_ken_bottle_receipt",
        orderId: "order_ken_bottles",
        kind: "shipping_receipt",
        fileName: "運費收據.png",
        mimeType: "image/png",
        size: kenReceipt.length,
        createdAt: "2026-10-14T02:05:00.000Z",
      },
    ])
    .run();

  db.insert(auditLogs)
    .values([
      {
        id: "audit_mei_sep_create",
        orderId: "order_mei_sep",
        actorId: mei.id,
        action: "order.created",
        summary: "建立訂單：無印良品 聚丙烯收納盒（¥2,480）",
        detail: null,
        createdAt: "2026-09-18T02:00:00.000Z",
      },
      {
        id: "audit_mei_sep_paid",
        orderId: "order_mei_sep",
        actorId: wendy.id,
        action: "status.paid",
        summary: "勾選已匯款（2026/09/20、¥2,480）",
        detail: null,
        createdAt: "2026-09-20T08:00:00.000Z",
      },
      {
        id: "audit_ken_mario_paid",
        orderId: "order_ken_mario",
        actorId: wendy.id,
        action: "status.paid",
        summary: "勾選已匯款（2026/10/10、NT$1,450）",
        detail: null,
        createdAt: "2026-10-10T04:00:00.000Z",
      },
    ])
    .run();
}

export function insertDemoDataIfEmpty(db: AppDb) {
  const existing = db.select({ id: users.id }).from(users).where(eq(users.previewSandbox, false)).limit(1).all();
  if (existing.length > 0) return false;
  insertDemoData(db);
  return true;
}
