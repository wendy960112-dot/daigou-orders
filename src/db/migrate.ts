import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";

export function migrationsDir() {
  const candidates = [
    path.join(process.cwd(), "drizzle"),
    path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "drizzle"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "0001_init.sql"))) return dir;
  }
  return candidates[0];
}

export function migrate(sqlite: Database.Database) {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);

  const dir = migrationsDir();
  if (!fs.existsSync(dir)) {
    throw new Error(`找不到資料庫遷移檔資料夾：${dir}`);
  }

  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const appliedStmt = sqlite.prepare("SELECT id FROM _migrations WHERE id = ?");
  const markStmt = sqlite.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)");

  for (const file of files) {
    if (appliedStmt.get(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((part) =>
        part
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .trim(),
      )
      .filter(Boolean);

    const pragmas = statements.filter((statement) => /^PRAGMA\b/i.test(statement));
    const body = statements.filter((statement) => !/^PRAGMA\b/i.test(statement));
    for (const statement of pragmas) sqlite.exec(statement);
    try {
      const apply = sqlite.transaction(() => {
        for (const statement of body) sqlite.exec(statement);
        markStmt.run(file, new Date().toISOString());
      });
      apply();
    } finally {
      sqlite.pragma("foreign_keys = ON");
    }
  }
}
