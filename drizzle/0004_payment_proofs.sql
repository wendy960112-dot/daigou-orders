-- 匯款截圖、運費報銷截圖。舊附件整筆複製，不刪檔。
CREATE TABLE attachments_new (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('order_proof', 'shipping_receipt', 'payment_proof', 'reimbursement_proof')),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
INSERT INTO attachments_new (id, order_id, kind, file_name, mime_type, size, created_at)
SELECT id, order_id, kind, file_name, mime_type, size, created_at FROM attachments;
--> statement-breakpoint
DROP TABLE attachments;
--> statement-breakpoint
ALTER TABLE attachments_new RENAME TO attachments;
--> statement-breakpoint
CREATE INDEX attachments_order_idx ON attachments (order_id);
