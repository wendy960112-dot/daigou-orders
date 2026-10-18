-- 任務派發。既有訂單整筆複製過來，金額與日期改成可空白，不刪舊欄位。
PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE product_options (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
INSERT INTO product_options (id, name, active, sort_order, created_at)
VALUES ('product_marukyu', '丸久小山園', 1, 0, '2026-10-16T00:00:00.000Z');
--> statement-breakpoint
CREATE TABLE orders_new (
  id TEXT PRIMARY KEY,
  helper_id TEXT NOT NULL REFERENCES users(id),
  product_option_id TEXT REFERENCES product_options(id),
  product_name TEXT NOT NULL,
  product_links TEXT,
  purchase_note TEXT,
  quantity INTEGER CHECK (quantity IS NULL OR quantity >= 1),
  order_amount INTEGER CHECK (order_amount IS NULL OR order_amount >= 0),
  order_currency TEXT CHECK (order_currency IS NULL OR order_currency IN ('JPY', 'TWD')),
  order_date TEXT,
  dispatched_on TEXT,
  expected_arrival_date TEXT,
  delivery_method TEXT CHECK (delivery_method IS NULL OR delivery_method IN ('handoff', 'ship_address', 'warehouse')),
  delivery_address TEXT,
  task_status TEXT CHECK (task_status IS NULL OR task_status IN ('pending', 'accepted', 'ordered', 'shipped')),
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
INSERT INTO orders_new (
  id, helper_id, product_name, product_links, quantity, order_amount, order_currency, order_date,
  expected_arrival_date, carrier, tracking_number, ship_date, shipping_cost, shipping_currency, notes,
  paid, paid_at, paid_amount, paid_currency, goods_received, goods_received_at,
  shipping_reimbursed, shipping_reimbursed_at, created_at, updated_at, dispatched_on, task_status
)
SELECT
  id, helper_id, product_name, product_links, quantity, order_amount, order_currency, order_date,
  expected_arrival_date, carrier, tracking_number, ship_date, shipping_cost, shipping_currency, notes,
  paid, paid_at, paid_amount, paid_currency, goods_received, goods_received_at,
  shipping_reimbursed, shipping_reimbursed_at, created_at, updated_at,
  order_date,
  CASE
    WHEN trim(coalesce(ship_date, '')) != '' OR trim(coalesce(tracking_number, '')) != '' THEN 'shipped'
    ELSE 'ordered'
  END
FROM orders;
--> statement-breakpoint
DROP TABLE orders;
--> statement-breakpoint
ALTER TABLE orders_new RENAME TO orders;
--> statement-breakpoint
CREATE INDEX orders_helper_idx ON orders (helper_id);
--> statement-breakpoint
CREATE INDEX orders_date_idx ON orders (order_date);
--> statement-breakpoint
CREATE INDEX orders_task_idx ON orders (helper_id, task_status);
