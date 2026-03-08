import process from "node:process"
import { PlaneClient, type Project } from "@makeplane/plane-node-sdk"
import { Box, Text, useApp, useInput } from "ink"
import { useEffect, useMemo, useState } from "react"
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
import {
  PlaneContext,
  type PlaneContextValue,
  usePlane,
} from "../hooks/plane.js"
import { PlaneConfigScreen } from "./plane-config.js"

type WorkspaceInfo = {
  origin: string
  slug: string
}

const getWorkspaceInfo = (workspaceUrl: string): WorkspaceInfo | null => {
  try {
    const url = new URL(workspaceUrl)
    const slug = url.pathname.split("/").filter(Boolean)[0]
    if (!slug) {
      return null
    }

    return {
      origin: url.origin,
      slug,
    }
  } catch {
    return null
  }
}

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
  const { client, workspaceSlug } = usePlane()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const loadProjects = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        if (!workspaceSlug) {
          throw new Error(
            "Plane workspace URL must include workspace slug (for example: https://app.plane.so/my-team).",
          )
        }

        const response = await client.projects.list(workspaceSlug)
        const nextProjects = Array.isArray(response.results)
          ? response.results
          : []
        if (!isActive) {
          return
        }

        setProjects(nextProjects)
      } catch (error) {
        if (!isActive) {
          return
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load Plane projects."
        setLoadError(message)
        setProjects([])
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadProjects()

    return () => {
      isActive = false
    }
  }, [client, workspaceSlug])

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
          flexDirection="column"
          padding={1}
        >
          <Text color="cyan">Plane Projects</Text>
          {isLoading ? <Text dimColor>Loading projects...</Text> : null}
          {loadError ? <Text color="red">{loadError}</Text> : null}
          {!isLoading && !loadError && projects.length === 0 ? (
            <Text dimColor>No projects found.</Text>
          ) : null}
          {!isLoading && !loadError
            ? projects.map((project) => (
                <Text key={project.id}>
                  {project.identifier
                    ? `${project.identifier}: ${project.name}`
                    : project.name}
                </Text>
              ))
            : null}
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
  const plane = useMemo<PlaneContextValue | null>(() => {
    if (!planeConfig.workspaceUrl || !planeConfig.token) {
      return null
    }

    const workspaceInfo = getWorkspaceInfo(planeConfig.workspaceUrl)

    return {
      client: new PlaneClient({
        baseUrl: workspaceInfo?.origin ?? "https://api.plane.so",
        apiKey: planeConfig.token,
      }),
      workspaceSlug: workspaceInfo?.slug ?? null,
    }
  }, [planeConfig.workspaceUrl, planeConfig.token])

  return (
    <MemoryRouter initialEntries={[setupRequired ? "/config" : "/"]}>
      <Routes>
        <Route
          path="/"
          element={
            plane === null ? (
              <Navigate to="/config" replace />
            ) : (
              <PlaneContext.Provider value={plane}>
                <MainScreen width={width} height={height} onExit={exit} />
              </PlaneContext.Provider>
            )
          }
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
