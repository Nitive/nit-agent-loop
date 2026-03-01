import type { DatabaseSync } from "node:sqlite"
import { createContext, useContext } from "react"

export type AppContextValue = {
  database: DatabaseSync
  fetch: typeof globalThis.fetch
  useExit: () => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext)
  if (context === null) {
    throw new Error("useAppContext must be used within <AppContext.Provider>")
  }

  return context
}
