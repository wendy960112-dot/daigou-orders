import fs from "fs";
import path from "path";
import { databasePath, openAppDatabase } from "./index";
import { importSkuCsv } from "./skus";

const file = process.argv[2] ?? path.join(process.cwd(), "data", "rakuten-products.csv");
if (!fs.existsSync(file)) {
  console.error(`找不到 ${file}`);
  process.exit(1);
}

const result = importSkuCsv(openAppDatabase(databasePath()), fs.readFileSync(file, "utf8"));
console.log(`新增 ${result.created}、更新 ${result.updated}、略過 ${result.excluded.length}、失敗 ${result.failed.length}。`);
for (const row of result.excluded) {
  console.log(`略過第 ${row.row} 列 ${row.code ?? ""} ${row.name}：${row.reason}`);
}
for (const failure of result.failed) {
  console.error(`第 ${failure.row} 列沒有匯入：${failure.reason}`);
}
if (result.failed.length > 0) process.exit(1);
