import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  lineUserId: text("line_user_id").unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  pictureUrl: text("picture_url"),
  role: text("role", { enum: ["admin", "helper", "pending"] }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const productOptions = sqliteTable("product_options", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    helperId: text("helper_id")
      .notNull()
      .references(() => users.id),
    productOptionId: text("product_option_id").references(() => productOptions.id),
    productName: text("product_name").notNull(),
    productLinks: text("product_links"),
    purchaseNote: text("purchase_note"),
    quantity: integer("quantity"),
    orderAmount: integer("order_amount"),
    orderCurrency: text("order_currency", { enum: ["JPY", "TWD"] }),
    orderDate: text("order_date"),
    dispatchedOn: text("dispatched_on"),
    expectedArrivalDate: text("expected_arrival_date"),
    deliveryMethod: text("delivery_method", { enum: ["handoff", "ship_address", "warehouse"] }),
    deliveryAddress: text("delivery_address"),
    taskStatus: text("task_status", { enum: ["pending", "accepted", "ordered", "shipped"] }),
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
    deletedAt: text("deleted_at"),
    deletedBy: text("deleted_by").references(() => users.id),
    proxyFields: text("proxy_fields"),
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
    kind: text("kind", { enum: ["order_proof", "shipping_receipt", "payment_proof", "reimbursement_proof"] }).notNull(),
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

export const passwordResets = sqliteTable(
  "password_resets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("password_resets_user_idx").on(table.userId)],
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("login_attempts_email_idx").on(table.email, table.createdAt)],
);

export const skus = sqliteTable(
  "skus",
  {
    id: text("id").primaryKey(),
    importKey: text("import_key").unique(),
    code: text("code"),
    name: text("name").notNull(),
    variant: text("variant").notNull().default(""),
    category: text("category"),
    subcategory: text("subcategory"),
    salePrice: integer("sale_price").notNull().default(0),
    cost: integer("cost").notNull().default(0),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("skus_name_idx").on(table.name), index("skus_code_idx").on(table.code)],
);

export const purchases = sqliteTable(
  "purchases",
  {
    id: text("id").primaryKey(),
    purchasedOn: text("purchased_on").notNull(),
    supplier: text("supplier").notNull(),
    currency: text("currency", { enum: ["JPY", "TWD"] }).notNull(),
    orderId: text("order_id").references(() => orders.id),
    shippingFee: integer("shipping_fee").notNull().default(0),
    otherFees: integer("other_fees").notNull().default(0),
    notes: text("notes"),
    sourceRef: text("source_ref"),
    sourceSubject: text("source_subject"),
    deletedAt: text("deleted_at"),
    deletedBy: text("deleted_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("purchases_date_idx").on(table.purchasedOn), index("purchases_source_idx").on(table.sourceRef)],
);

export const purchaseLines = sqliteTable(
  "purchase_lines",
  {
    id: text("id").primaryKey(),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    skuId: text("sku_id")
      .notNull()
      .references(() => skus.id),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
  },
  (table) => [index("purchase_lines_purchase_idx").on(table.purchaseId), index("purchase_lines_sku_idx").on(table.skuId)],
);

export const purchaseFiles = sqliteTable(
  "purchase_files",
  {
    id: text("id").primaryKey(),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("purchase_files_purchase_idx").on(table.purchaseId)],
);

export const purchaseAuditLogs = sqliteTable(
  "purchase_audit_logs",
  {
    id: text("id").primaryKey(),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id),
    actorLabel: text("actor_label").notNull(),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("purchase_audit_purchase_idx").on(table.purchaseId)],
);

export type User = typeof users.$inferSelect;
export type ProductOption = typeof productOptions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Sku = typeof skus.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
