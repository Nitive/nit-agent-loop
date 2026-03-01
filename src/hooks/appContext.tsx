import type { DatabaseSync } from "node:sqlite"
import { useCallback, useRef } from "react"
import { openDatabase } from "../db/database.js"
import { useExitHandlers } from "./exit.js"

type AppContext = {
  database: DatabaseSync
  useExit: () => void
}

export const useAppContext = (): AppContext => {
  const databaseRef = useRef<DatabaseSync | null>(null)
  const isClosedRef = useRef(false)

  if (databaseRef.current === null) {
    databaseRef.current = openDatabase()
  }

  const cleanup = useCallback(() => {
    if (isClosedRef.current || databaseRef.current === null) {
      return
    }

    databaseRef.current.close()
    isClosedRef.current = true
  }, [])

  const useExit = () => {
    useExitHandlers(cleanup)
  }

  return {
    database: databaseRef.current,
    useExit,
  }
}
