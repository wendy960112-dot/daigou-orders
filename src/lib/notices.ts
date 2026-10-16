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
  need_amount: "小幫手還沒回報訂購金額，先不要勾已匯款。",
  accepted: "已接下這張單。請填金額和訂單截圖。",
  not_pending: "這張單現在不能接。",
  product_taken: "已經有這個商品名稱。",
  last_product: "至少要留一個可以使用的商品名稱。",
  dispatched: "已把任務派給小幫手。",
  product_saved: "已更新商品名稱。",
  no_email: "這個人沒有電子郵件，不能重設密碼。",
  reset_link: "已產生重設連結。請複製下面的網址，用 LINE 傳給對方。",
  email_sent: "已寄出重設信，連結也顯示在下面。",
  email_failed: "信沒有寄出。請改把下面的連結傳給對方。",
};

export function noticeTone(code: string) {
  return code === "need_shipping" ||
    code === "forbidden" ||
    code === "self" ||
    code === "last_admin" ||
    code === "not_found" ||
    code === "invalid" ||
    code === "no_email" ||
    code === "email_failed" ||
    code === "need_amount" ||
    code === "not_pending" ||
    code === "product_taken" ||
    code === "last_product"
    ? "warn"
    : "good";
}
