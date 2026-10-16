-- 軟刪除。任務先從列表藏起來，截圖留著，管理員可以還原。
ALTER TABLE orders ADD COLUMN deleted_at TEXT;
--> statement-breakpoint
ALTER TABLE orders ADD COLUMN deleted_by TEXT REFERENCES users(id);
