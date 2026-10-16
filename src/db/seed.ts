import { getDb } from "./index";
import { insertDemoDataIfEmpty } from "./seed-data";

if (process.env.NODE_ENV === "production") {
  console.error("正式環境不寫入示範資料。");
  process.exit(1);
}

const inserted = insertDemoDataIfEmpty(getDb());
console.log(inserted ? "已寫入示範訂單。" : "資料庫裡已經有資料，沒有覆寫。若要重來，請刪掉 data 資料夾後再執行一次。");
