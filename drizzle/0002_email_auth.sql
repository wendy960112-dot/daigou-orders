-- 電子郵件登入。密碼只存雜湊，重設用的代碼只存 SHA-256，登入失敗次數用來限流。
ALTER TABLE users ADD COLUMN email TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN password_hash TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
--> statement-breakpoint
CREATE TABLE password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets(user_id);
--> statement-breakpoint
CREATE TABLE login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON login_attempts(email, created_at);
