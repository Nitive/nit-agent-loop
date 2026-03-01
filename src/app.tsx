import { useCallback, useMemo, useRef } from "react"
import { AppView } from "./components/app-view.js"
import { AppContext, type AppContextValue } from "./hooks/app-context.js"
import { useExitHandlers } from "./hooks/exit.js"
import {
  createAppContextValue,
  createManagedDatabase,
} from "./utils/app-context.js"

const useDefaultAppContext = (): AppContextValue => {
  const managedDatabaseRef = useRef<ReturnType<
    typeof createManagedDatabase
  > | null>(null)
  if (managedDatabaseRef.current === null) {
    managedDatabaseRef.current = createManagedDatabase()
  }

  const closeDatabase = useCallback(() => {
    managedDatabaseRef.current?.close()
  }, [])

  return useMemo(
    () =>
      createAppContextValue({
        database: managedDatabaseRef.current!.database,
        useExit: () => {
          useExitHandlers(closeDatabase)
        },
      }),
    [closeDatabase],
  )
}

type AppWithContextProps = {
  context: AppContextValue
}

export const AppWithContext = ({ context }: AppWithContextProps) => {
  return (
    <AppContext.Provider value={context}>
      <AppView />
    </AppContext.Provider>
  )
}

export const App = () => {
  const context = useDefaultAppContext()
  return <AppWithContext context={context} />
}
