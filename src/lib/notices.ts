export const NOTICES: Record<string, string> = {
  saved: "已儲存訂單。",
  status: "已更新狀態。",
  status_same: "狀態跟原來一樣，沒有變更。",
  deleted: "已刪除附件。",
  need_shipping: "請先填好運費金額，才能勾選運費已報銷。",
  forbidden: "沒有權限做這件事。",
  role: "已更新小幫手的身份。",
  not_found: "找不到這筆資料。",
  invalid: "有欄位填得不對，請再看一次。",
  self: "不能改自己的身份。",
  last_admin: "至少要留一位管理員。",
};

export function noticeTone(code: string) {
  return code === "need_shipping" || code === "forbidden" || code === "self" || code === "last_admin" || code === "not_found" || code === "invalid"
    ? "warn"
    : "good";
}
