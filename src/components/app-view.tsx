import process from "node:process"
import { Box, Text, useApp, useInput } from "ink"
import { useState } from "react"
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router"
import {
  getPlaneConfig,
  savePlaneConfig,
  type PlaneConfig,
} from "../db/database.js"
import { useAppContext } from "../hooks/app-context.js"
import { PlaneConfigScreen } from "./plane-config.js"

const MainScreen = ({
  width,
  height,
  onExit,
}: {
  width: number
  height: number
  onExit: () => void
}) => {
  const navigate = useNavigate()

  useInput((input) => {
    if (input === "q") {
      onExit()
      return
    }

    if (input === "c") {
      navigate("/config")
    }
  })

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

const ConfigScreen = ({
  width,
  height,
  planeConfig,
  setupRequired,
  onSaveConfig,
}: {
  width: number
  height: number
  planeConfig: PlaneConfig
  setupRequired: boolean
  onSaveConfig: (config: { workspaceUrl: string; token: string }) => void
}) => {
  const navigate = useNavigate()

  return (
    <PlaneConfigScreen
      width={width}
      height={height}
      initialWorkspaceUrl={planeConfig.workspaceUrl ?? ""}
      initialToken={planeConfig.token ?? ""}
      allowCancel={!setupRequired}
      onSave={(config) => {
        onSaveConfig(config)
        navigate("/", { replace: true })
      }}
      onCancel={() => {
        navigate("/", { replace: true })
      }}
    />
  )
}

export const AppView = () => {
  const { exit } = useApp()
  const { database, useExit } = useAppContext()
  useExit()

  const [planeConfig, setPlaneConfig] = useState<PlaneConfig>(() =>
    getPlaneConfig(database),
  )
  const setupRequired = !planeConfig.workspaceUrl || !planeConfig.token

  const width = process.stdout.columns || 80
  const height = process.stdout.rows || 24

  return (
    <MemoryRouter initialEntries={[setupRequired ? "/config" : "/"]}>
      <Routes>
        <Route
          path="/"
          element={<MainScreen width={width} height={height} onExit={exit} />}
        />
        <Route
          path="/config"
          element={
            <ConfigScreen
              width={width}
              height={height}
              planeConfig={planeConfig}
              setupRequired={setupRequired}
              onSaveConfig={({ workspaceUrl, token }) => {
                savePlaneConfig(database, { workspaceUrl, token })
                setPlaneConfig({ workspaceUrl, token })
              }}
            />
          }
        />
        <Route
          path="*"
          element={<Navigate to={setupRequired ? "/config" : "/"} replace />}
        />
      </Routes>
    </MemoryRouter>
  )
}
