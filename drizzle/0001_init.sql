-- 代購單初始資料表。
-- 金額以整數保存（日圓、新台幣都不使用小數），兩種幣別分開加總，不自動換匯。
-- 上傳的截圖與收據放在 UPLOAD_DIR，這裡只記檔名與類型。

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  line_user_id TEXT UNIQUE,
  display_name TEXT NOT NULL,
  picture_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'helper', 'pending')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  helper_id TEXT NOT NULL REFERENCES users(id),
  product_name TEXT NOT NULL,
  product_links TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  order_amount INTEGER NOT NULL CHECK (order_amount >= 0),
  order_currency TEXT NOT NULL CHECK (order_currency IN ('JPY', 'TWD')),
  order_date TEXT NOT NULL,
  expected_arrival_date TEXT,
  carrier TEXT,
  tracking_number TEXT,
  ship_date TEXT,
  shipping_cost INTEGER CHECK (shipping_cost IS NULL OR shipping_cost >= 0),
  shipping_currency TEXT CHECK (shipping_currency IS NULL OR shipping_currency IN ('JPY', 'TWD')),
  notes TEXT,
  paid INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0, 1)),
  paid_at TEXT,
  paid_amount INTEGER CHECK (paid_amount IS NULL OR paid_amount >= 0),
  paid_currency TEXT CHECK (paid_currency IS NULL OR paid_currency IN ('JPY', 'TWD')),
  goods_received INTEGER NOT NULL DEFAULT 0 CHECK (goods_received IN (0, 1)),
  goods_received_at TEXT,
  shipping_reimbursed INTEGER NOT NULL DEFAULT 0 CHECK (shipping_reimbursed IN (0, 1)),
  shipping_reimbursed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX orders_helper_idx ON orders (helper_id);
--> statement-breakpoint
CREATE INDEX orders_date_idx ON orders (order_date);
--> statement-breakpoint
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('order_proof', 'shipping_receipt')),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX attachments_order_idx ON attachments (order_id);
--> statement-breakpoint
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users (id),
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX audit_order_idx ON audit_logs (order_id);
