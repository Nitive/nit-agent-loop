import fs from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

const defaultDataDir = path.resolve(process.cwd(), "data")
export const defaultDatabasePath = path.join(defaultDataDir, "app.sqlite")

export const openDatabase = (databasePath = defaultDatabasePath) => {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true })

  const database = new DatabaseSync(databasePath)

  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  return database
}
