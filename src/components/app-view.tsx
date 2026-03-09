import process from "node:process"
import {
  PlaneClient,
  type Project,
  type WorkItem,
} from "@makeplane/plane-node-sdk"
import { Box, Text, useApp, useInput } from "ink"
import { useCallback, useEffect, useMemo, useState } from "react"
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

const getProjectLabel = (project: Project) => {
  return project.identifier
    ? `${project.identifier}: ${project.name}`
    : project.name
}

const getSelectedProjectIdOrFallback = (
  projects: Project[],
  selectedProjectId: string | null,
) => {
  if (selectedProjectId && projects.some((project) => project.id === selectedProjectId)) {
    return selectedProjectId
  }

  return projects[0]?.id ?? null
}

const truncateLabel = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

const getTaskLabel = (task: WorkItem, maxLength: number) => {
  return truncateLabel(`#${task.sequence_id} ${task.name}`, maxLength)
}

const getTaskReference = (
  task: WorkItem,
  selectedProject: Project | null,
) => {
  if (selectedProject?.identifier) {
    return `${selectedProject.identifier}-${task.sequence_id}`
  }

  return `#${task.sequence_id}`
}

const MainScreen = ({
  width,
  height,
  selectedProjectId,
  onSelectProject,
  onExit,
}: {
  width: number
  height: number
  selectedProjectId: string | null
  onSelectProject: (projectId: string) => void
  onExit: () => void
}) => {
  const navigate = useNavigate()
  const { client, workspaceSlug } = usePlane()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [tasks, setTasks] = useState<WorkItem[]>([])
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0)
  const activeProjectId = useMemo(
    () => getSelectedProjectIdOrFallback(projects, selectedProjectId),
    [projects, selectedProjectId],
  )
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  )
  const selectedTask = tasks[selectedTaskIndex] ?? null
  const sidebarTaskLabelLength = Math.max(18, Math.floor(width * 0.28) - 8)

  useEffect(() => {
    let isActive = true

    const loadProjects = async () => {
      setIsLoadingProjects(true)
      setProjectsError(null)

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
        setProjectsError(message)
        setProjects([])
      } finally {
        if (isActive) {
          setIsLoadingProjects(false)
        }
      }
    }

    loadProjects()

    return () => {
      isActive = false
    }
  }, [client, workspaceSlug])

  useEffect(() => {
    if (!activeProjectId || activeProjectId === selectedProjectId) {
      return
    }

    onSelectProject(activeProjectId)
  }, [activeProjectId, onSelectProject, selectedProjectId])

  useEffect(() => {
    let isActive = true

    const loadTasks = async () => {
      if (!workspaceSlug || !activeProjectId) {
        setTasks([])
        setTasksError(null)
        setIsLoadingTasks(false)
        return
      }

      setIsLoadingTasks(true)
      setTasksError(null)

      try {
        const response = await client.workItems.list(workspaceSlug, activeProjectId, {
          limit: 50,
        })
        const nextTasks = Array.isArray(response.results) ? response.results : []
        if (!isActive) {
          return
        }

        setTasks(nextTasks)
      } catch (error) {
        if (!isActive) {
          return
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load Plane project tasks."
        setTasksError(message)
        setTasks([])
      } finally {
        if (isActive) {
          setIsLoadingTasks(false)
        }
      }
    }

    loadTasks()

    return () => {
      isActive = false
    }
  }, [activeProjectId, client, workspaceSlug])

  useEffect(() => {
    setSelectedTaskIndex(0)
  }, [activeProjectId])

  useEffect(() => {
    if (tasks.length === 0) {
      setSelectedTaskIndex(0)
      return
    }

    setSelectedTaskIndex((current) => Math.min(current, tasks.length - 1))
  }, [tasks])

  useInput((input, key) => {
    if (input === "q") {
      onExit()
      return
    }

    if (input === "c") {
      navigate("/config")
      return
    }

    if (tasks.length === 0) {
      return
    }

    if (key.upArrow) {
      setSelectedTaskIndex((current) => Math.max(0, current - 1))
      return
    }

    if (key.downArrow) {
      setSelectedTaskIndex((current) => Math.min(tasks.length - 1, current + 1))
    }
  })

  return (
    <Box width={width} height={height} flexDirection="column">
      <Box flexGrow={1} flexDirection="row">
        <Box
          width="28%"
          height="100%"
          borderStyle="single"
          flexDirection="column"
          padding={1}
        >
          <Text color="cyan">Project Tasks</Text>
          {selectedProject ? (
            <Text dimColor>{getProjectLabel(selectedProject)}</Text>
          ) : null}
          {isLoadingProjects ? <Text dimColor>Loading projects...</Text> : null}
          {projectsError ? <Text color="red">{projectsError}</Text> : null}
          {!isLoadingProjects && !projectsError && projects.length === 0 ? (
            <Text dimColor>No projects found.</Text>
          ) : null}
          {!isLoadingProjects && !projectsError && !activeProjectId ? (
            <Text dimColor>Select a project in configuration.</Text>
          ) : null}
          {isLoadingTasks ? <Text dimColor>Loading tasks...</Text> : null}
          {tasksError ? <Text color="red">{tasksError}</Text> : null}
          {!isLoadingTasks && !tasksError && tasks.length === 0 && activeProjectId ? (
            <Text dimColor>No tasks found.</Text>
          ) : null}
          {!isLoadingTasks && !tasksError
            ? tasks.map((task, index) => (
                <Text
                  key={task.id}
                  color={index === selectedTaskIndex ? "green" : undefined}
                >
                  {index === selectedTaskIndex ? "> " : "  "}
                  {getTaskLabel(task, sidebarTaskLabelLength)}
                </Text>
              ))
            : null}
        </Box>
        <Box
          width="72%"
          height="100%"
          borderStyle="single"
          flexDirection="column"
          padding={1}
        >
          <Text color="cyan">Task Details</Text>
          {selectedTask ? (
            <>
              <Text>
                Task:{" "}
                <Text color="yellow">
                  {getTaskReference(selectedTask, selectedProject)}
                </Text>
              </Text>
              <Text>
                Title: <Text color="yellow">{selectedTask.name}</Text>
              </Text>
              <Text>
                Priority: <Text color="yellow">{selectedTask.priority ?? "none"}</Text>
              </Text>
              <Text>
                State: <Text color="yellow">{selectedTask.state ?? "n/a"}</Text>
              </Text>
              <Text>
                Start: <Text color="yellow">{selectedTask.start_date ?? "n/a"}</Text>
              </Text>
              <Text>
                Target: <Text color="yellow">{selectedTask.target_date ?? "n/a"}</Text>
              </Text>
              <Text>
                Assignees:{" "}
                <Text color="yellow">{selectedTask.assignees?.length ?? 0}</Text>
              </Text>
              <Text>Description:</Text>
              <Text color="yellow">
                {selectedTask.description_stripped?.trim() || "<empty>"}
              </Text>
            </>
          ) : (
            <Text dimColor>
              {activeProjectId
                ? "No task selected."
                : "Press c to open configuration and select a project."}
            </Text>
          )}
        </Box>
      </Box>
      <Box height={1} paddingX={1}>
        <Text dimColor>q:Quit c:Config Up/Down:Select Task</Text>
      </Box>
    </Box>
  )
}

const ConfigScreen = ({
  width,
  height,
  planeConfig,
  setupRequired,
  plane,
  onSaveConfig,
}: {
  width: number
  height: number
  planeConfig: PlaneConfig
  setupRequired: boolean
  plane: PlaneContextValue | null
  onSaveConfig: (config: {
    workspaceUrl: string
    token: string
    selectedProjectId: string | null
  }) => void
}) => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const loadProjects = async () => {
      if (plane === null || plane.workspaceSlug === null) {
        setProjects([])
        setProjectsError(null)
        setIsLoadingProjects(false)
        return
      }

      setIsLoadingProjects(true)
      setProjectsError(null)
      try {
        const response = await plane.client.projects.list(plane.workspaceSlug)
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

        setProjects([])
        setProjectsError(
          error instanceof Error ? error.message : "Unable to load projects.",
        )
      } finally {
        if (isActive) {
          setIsLoadingProjects(false)
        }
      }
    }

    loadProjects()

    return () => {
      isActive = false
    }
  }, [plane])

  return (
    <PlaneConfigScreen
      width={width}
      height={height}
      initialWorkspaceUrl={planeConfig.workspaceUrl ?? ""}
      initialToken={planeConfig.token ?? ""}
      initialSelectedProjectId={planeConfig.selectedProjectId}
      projects={projects}
      isLoadingProjects={isLoadingProjects}
      projectsError={projectsError}
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

  const updatePlaneConfig = useCallback(
    (nextConfig: PlaneConfig) => {
      setPlaneConfig(nextConfig)
      if (!nextConfig.workspaceUrl || !nextConfig.token) {
        return
      }

      savePlaneConfig(database, {
        workspaceUrl: nextConfig.workspaceUrl,
        token: nextConfig.token,
        selectedProjectId: nextConfig.selectedProjectId,
      })
    },
    [database],
  )

  const updateSelectedProject = useCallback(
    (selectedProjectId: string | null) => {
      if (planeConfig.selectedProjectId === selectedProjectId) {
        return
      }

      updatePlaneConfig({
        ...planeConfig,
        selectedProjectId,
      })
    },
    [planeConfig, updatePlaneConfig],
  )

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
                <MainScreen
                  width={width}
                  height={height}
                  selectedProjectId={planeConfig.selectedProjectId}
                  onSelectProject={(projectId) => {
                    updateSelectedProject(projectId)
                  }}
                  onExit={exit}
                />
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
              plane={plane}
              onSaveConfig={({ workspaceUrl, token, selectedProjectId }) => {
                const workspaceChanged =
                  planeConfig.workspaceUrl !== workspaceUrl ||
                  planeConfig.token !== token

                updatePlaneConfig({
                  workspaceUrl,
                  token,
                  selectedProjectId: workspaceChanged ? null : selectedProjectId,
                })
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
