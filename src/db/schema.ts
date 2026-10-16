import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  lineUserId: text("line_user_id").unique(),
  displayName: text("display_name").notNull(),
  pictureUrl: text("picture_url"),
  role: text("role", { enum: ["admin", "helper", "pending"] }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    helperId: text("helper_id")
      .notNull()
      .references(() => users.id),
    productName: text("product_name").notNull(),
    productLinks: text("product_links").notNull(),
    quantity: integer("quantity").notNull(),
    orderAmount: integer("order_amount").notNull(),
    orderCurrency: text("order_currency", { enum: ["JPY", "TWD"] }).notNull(),
    orderDate: text("order_date").notNull(),
    expectedArrivalDate: text("expected_arrival_date"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    shipDate: text("ship_date"),
    shippingCost: integer("shipping_cost"),
    shippingCurrency: text("shipping_currency", { enum: ["JPY", "TWD"] }),
    notes: text("notes"),
    paid: integer("paid", { mode: "boolean" }).notNull().default(false),
    paidAt: text("paid_at"),
    paidAmount: integer("paid_amount"),
    paidCurrency: text("paid_currency", { enum: ["JPY", "TWD"] }),
    goodsReceived: integer("goods_received", { mode: "boolean" }).notNull().default(false),
    goodsReceivedAt: text("goods_received_at"),
    shippingReimbursed: integer("shipping_reimbursed", { mode: "boolean" })
      .notNull()
      .default(false),
    shippingReimbursedAt: text("shipping_reimbursed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("orders_helper_idx").on(table.helperId),
    index("orders_date_idx").on(table.orderDate),
  ],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["order_proof", "shipping_receipt"] }).notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("attachments_order_idx").on(table.orderId)],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    detail: text("detail"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("audit_order_idx").on(table.orderId)],
);

export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
