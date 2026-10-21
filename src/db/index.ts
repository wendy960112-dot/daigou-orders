import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "./migrate";
import * as schema from "./schema";
import { importBundledSkusIfEmpty } from "./skus";
import { insertDemoDataIfEmpty } from "./seed-data";
import type { AppDb } from "./types";

const globalForDb = globalThis as unknown as { __daigouDb?: AppDb };

export function resetDbCache() {
  globalForDb.__daigouDb = undefined;
}

export function databasePath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "daigou.db");
}

export function openAppDatabase(filename: string): AppDb {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const sqlite = new Database(filename);
  sqlite.pragma("foreign_keys = ON");
  if (filename !== ":memory:") sqlite.pragma("journal_mode = WAL");
  migrate(sqlite);
  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!globalForDb.__daigouDb) {
    const db = openAppDatabase(databasePath());
    if (process.env.NODE_ENV === "development") insertDemoDataIfEmpty(db);
    importBundledSkusIfEmpty(db);
    globalForDb.__daigouDb = db;
  }
  return globalForDb.__daigouDb;
}
