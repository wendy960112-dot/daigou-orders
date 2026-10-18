-- 物流公司固定成 EMS 之後，只填了物流公司的回報被標成已寄出。
-- 沒有追蹤單號、也沒有寄出日期的，改回已下單。已刪除的不動。
-- 異動紀錄的 actor 必填且要對到使用者，沒有系統帳號可寫，所以這裡不補紀錄。
-- 網站啟動時 migrate() 會對 DATABASE_PATH 跑一次；_migrations 有這筆之後不會再跑。
UPDATE orders
SET task_status = 'ordered'
WHERE deleted_at IS NULL
  AND task_status = 'shipped'
  AND trim(coalesce(tracking_number, '')) = ''
  AND trim(coalesce(ship_date, '')) = '';
