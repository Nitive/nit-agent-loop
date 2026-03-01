import type { DatabaseSync } from "node:sqlite"
import process from "node:process"
import { Box, Text, useApp, useInput } from "ink"
import { useCallback, useRef, useState } from "react"
import { PlaneConfigScreen } from "./components/planeConfig.js"
import {
  getPlaneConfig,
  openDatabase,
  savePlaneConfig,
  type PlaneConfig,
} from "./db/database.js"
import {
  AppContext,
  type AppContextValue,
  useAppContext,
} from "./hooks/appContext.js"
import { useExitHandlers } from "./hooks/exit.js"

type View = "main" | "config"

const useDefaultAppContext = (): AppContextValue => {
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
    fetch: globalThis.fetch,
    useExit,
  }
}

const AppView = () => {
  const { exit } = useApp()
  const { database, useExit } = useAppContext()
  useExit()

  const [planeConfig, setPlaneConfig] = useState<PlaneConfig>(() =>
    getPlaneConfig(database),
  )
  const setupRequired = !planeConfig.workspaceUrl || !planeConfig.token
  const [view, setView] = useState<View>(setupRequired ? "config" : "main")

  useInput(
    (input) => {
      if (input === "q") {
        exit()
        return
      }

      if (input === "c") {
        setView("config")
      }
    },
    { isActive: view === "main" },
  )

  const width = process.stdout.columns || 80
  const height = process.stdout.rows || 24

  if (view === "config") {
    return (
      <PlaneConfigScreen
        width={width}
        height={height}
        initialWorkspaceUrl={planeConfig.workspaceUrl ?? ""}
        initialToken={planeConfig.token ?? ""}
        allowCancel={!setupRequired}
        onSave={({ workspaceUrl, token }) => {
          savePlaneConfig(database, { workspaceUrl, token })
          setPlaneConfig({ workspaceUrl, token })
          setView("main")
        }}
        onCancel={() => {
          setView("main")
        }}
      />
    )
  }

  return (
    <Box width={width} height={height} flexDirection="column">
      <Box flexGrow={1} flexDirection="row">
        <Box
          width="50%"
          height="100%"
          borderStyle="single"
          justifyContent="center"
          alignItems="center"
        >
          <Text>hello</Text>
        </Box>
        <Box
          width="50%"
          height="100%"
          borderStyle="single"
          justifyContent="center"
          alignItems="center"
        >
          <Text>(world)</Text>
        </Box>
      </Box>
      <Box height={1} paddingX={1}>
        <Text dimColor>q:Quit c:Config</Text>
      </Box>
    </Box>
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
