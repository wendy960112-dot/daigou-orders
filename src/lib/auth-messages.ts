export const AUTH_ERRORS: Record<string, string> = {
  line_denied: "你取消了 LINE 登入。",
  line_state: "登入驗證已過期，請再試一次。",
  line_failed: "LINE 登入沒有成功，請稍後再試。",
  line_config: "還沒設定 LINE 頻道。可以先用下面的試用登入，或照說明書設定。",
  bad_credentials: "帳號或密碼不正確。",
  rate_limited: "嘗試太多次，請 15 分鐘後再試。",
  email_taken: "這個信箱已經註冊，請直接登入。",
  invalid_email: "請填一個有效的電子郵件。",
  weak_password: "密碼至少 8 個字，最多 72 個字。",
  mismatch: "兩次密碼不一樣。",
  invalid_name: "請填顯示名稱，最多 40 個字。",
  reset_invalid: "這個重設連結已經不能用。請管理員再產生一次。",
  smtp_off: "還沒設定寄信。請管理員在「幫手」頁產生重設連結。",
};

export const AUTH_NOTICES: Record<string, string> = {
  password_reset: "密碼已更新，請用新密碼登入。",
  reset_requested: "如果這個信箱有註冊，我們會寄出重設信。請檢查收件匣。",
};
