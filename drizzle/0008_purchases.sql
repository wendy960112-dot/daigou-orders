-- 進貨：商品主檔與買入紀錄。這一版只記買入，不扣庫存。
CREATE TABLE skus (
  id TEXT PRIMARY KEY,
  import_key TEXT UNIQUE,
  code TEXT,
  name TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT '',
  category TEXT,
  subcategory TEXT,
  sale_price INTEGER NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  cost INTEGER NOT NULL DEFAULT 0 CHECK (cost >= 0),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX skus_name_idx ON skus (name);
--> statement-breakpoint
CREATE INDEX skus_code_idx ON skus (code);
--> statement-breakpoint
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  purchased_on TEXT NOT NULL,
  supplier TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('JPY', 'TWD')),
  order_id TEXT REFERENCES orders(id),
  shipping_fee INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  other_fees INTEGER NOT NULL DEFAULT 0 CHECK (other_fees >= 0),
  notes TEXT,
  source_ref TEXT,
  source_subject TEXT,
  deleted_at TEXT,
  deleted_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX purchases_date_idx ON purchases (purchased_on);
--> statement-breakpoint
CREATE INDEX purchases_source_idx ON purchases (source_ref);
--> statement-breakpoint
CREATE TABLE purchase_lines (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL REFERENCES skus(id),
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0)
);
--> statement-breakpoint
CREATE INDEX purchase_lines_purchase_idx ON purchase_lines (purchase_id);
--> statement-breakpoint
CREATE INDEX purchase_lines_sku_idx ON purchase_lines (sku_id);
--> statement-breakpoint
CREATE TABLE purchase_files (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX purchase_files_purchase_idx ON purchase_files (purchase_id);
--> statement-breakpoint
CREATE TABLE purchase_audit_logs (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id),
  actor_label TEXT NOT NULL,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX purchase_audit_purchase_idx ON purchase_audit_logs (purchase_id);
