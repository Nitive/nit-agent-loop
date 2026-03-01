import path from "node:path"
import { DatabaseSync } from "node:sqlite"

export const defaultDataDir = path.resolve(process.cwd(), "data")
export const defaultDatabasePath = path.join(defaultDataDir, "app.sqlite")

const planeWorkspaceUrlKey = "plane.workspace_url"
const planeTokenKey = "plane.token"

export type PlaneConfig = {
  workspaceUrl: string | null
  token: string | null
}

export const openDatabase = (databasePath = defaultDatabasePath) => {
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

export const getMetaValue = (database: DatabaseSync, key: string) => {
  const row = database
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .get(key) as { value: string } | undefined

  return row?.value ?? null
}

export const setMetaValue = (
  database: DatabaseSync,
  key: string,
  value: string,
) => {
  database
    .prepare(
      `
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `,
    )
    .run(key, value)
}

export const getPlaneConfig = (database: DatabaseSync): PlaneConfig => {
  return {
    workspaceUrl: getMetaValue(database, planeWorkspaceUrlKey),
    token: getMetaValue(database, planeTokenKey),
  }
}

export const savePlaneConfig = (
  database: DatabaseSync,
  config: { workspaceUrl: string; token: string },
) => {
  setMetaValue(database, planeWorkspaceUrlKey, config.workspaceUrl)
  setMetaValue(database, planeTokenKey, config.token)
}
