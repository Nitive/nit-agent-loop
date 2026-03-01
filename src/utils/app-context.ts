import type { DatabaseSync } from "node:sqlite"
import { openDatabase } from "../db/database.js"
import type { AppContextValue } from "../hooks/app-context.js"

type CreateAppContextValueOptions = {
  database: DatabaseSync
  fetch?: typeof globalThis.fetch
  useExit?: () => void
}

export const createAppContextValue = ({
  database,
  fetch = globalThis.fetch,
  useExit = () => {},
}: CreateAppContextValueOptions): AppContextValue => {
  return {
    database,
    fetch,
    useExit,
  }
}

type ManagedDatabase = {
  database: DatabaseSync
  close: () => void
}

export const createManagedDatabase = (
  databasePath?: string,
): ManagedDatabase => {
  const database = openDatabase(databasePath)
  let isClosed = false

  return {
    database,
    close: () => {
      if (isClosed) {
        return
      }

      database.close()
      isClosed = true
    },
  }
}
