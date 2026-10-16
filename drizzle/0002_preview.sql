-- 小幫手視角用的練習帳號。preview_sandbox = 1 的訂單預設不進彙總與正式列表。
ALTER TABLE users ADD COLUMN preview_sandbox INTEGER NOT NULL DEFAULT 0 CHECK (preview_sandbox IN (0, 1));
