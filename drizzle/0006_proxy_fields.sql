-- 管理員代填時，記下哪些欄位是代填的。小幫手看得到標記，資料仍留在原訂單。
ALTER TABLE orders ADD COLUMN proxy_fields TEXT;
