import path from "node:path"
import { DatabaseSync } from "node:sqlite"

export const defaultDataDir = path.resolve(process.cwd(), "data")
export const defaultDatabasePath = path.join(defaultDataDir, "app.sqlite")

const planeWorkspaceUrlKey = "plane.workspace_url"
const planeTokenKey = "plane.token"
const planeWebhookSecretKey = "plane.webhook_secret"
const planeSelectedProjectIdKey = "plane.selected_project_id"
const planePublicHostKey = "plane.public_host"
const webhookServerPortKey = "webhook.server_port"

export type PlaneConfig = {
  workspaceUrl: string | null
  token: string | null
  webhookSecret: string | null
  selectedProjectId: string | null
  publicHost: string
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

export const deleteMetaValue = (database: DatabaseSync, key: string) => {
  database.prepare("DELETE FROM app_meta WHERE key = ?").run(key)
}

export const getPlaneConfig = (database: DatabaseSync): PlaneConfig => {
  const publicHostValue = getMetaValue(database, planePublicHostKey)

  return {
    workspaceUrl: getMetaValue(database, planeWorkspaceUrlKey),
    token: getMetaValue(database, planeTokenKey),
    webhookSecret: getMetaValue(database, planeWebhookSecretKey),
    selectedProjectId: getMetaValue(database, planeSelectedProjectIdKey),
    publicHost: publicHostValue?.trim() || "localhost",
  }
}

export const savePlaneConfig = (
  database: DatabaseSync,
  config: {
    workspaceUrl: string
    token: string
    webhookSecret: string | null
    selectedProjectId: string | null
    publicHost: string
  },
) => {
  setMetaValue(database, planeWorkspaceUrlKey, config.workspaceUrl)
  setMetaValue(database, planeTokenKey, config.token)
  if (config.webhookSecret === null) {
    deleteMetaValue(database, planeWebhookSecretKey)
  } else {
    setMetaValue(database, planeWebhookSecretKey, config.webhookSecret)
  }
  setMetaValue(database, planePublicHostKey, config.publicHost || "localhost")
  if (config.selectedProjectId === null) {
    deleteMetaValue(database, planeSelectedProjectIdKey)
    return
  }

  setMetaValue(database, planeSelectedProjectIdKey, config.selectedProjectId)
}

export const getWebhookServerPort = (database: DatabaseSync) => {
  const rawPort = getMetaValue(database, webhookServerPortKey)
  if (rawPort === null) {
    return null
  }

  const port = Number.parseInt(rawPort, 10)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return null
  }

  return port
}

export const saveWebhookServerPort = (database: DatabaseSync, port: number) => {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Webhook server port must be an integer between 1 and 65535.")
  }

  setMetaValue(database, webhookServerPortKey, String(port))
}
