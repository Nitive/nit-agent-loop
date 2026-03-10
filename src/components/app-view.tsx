import process from "node:process"
import {
  PlaneClient,
  type Project,
  type WorkItem,
} from "@makeplane/plane-node-sdk"
import { Box, Text, useApp, useInput } from "ink"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import {
  buildPlaneWebhookUrl,
} from "../services/plane-webhook.js"
import {
  startPlaneWebhookServer,
  type PlaneWebhookEvent,
  type PlaneWebhookServer,
} from "../server/plane-webhook-server.js"
import { PlaneConfigScreen } from "./plane-config.js"

type WorkspaceInfo = {
  origin: string
  slug: string
}

type WebhookStatus = {
  text: string
  tone: "error" | "info" | "success"
}

type EventLog = {
  id: string
  message: string
  timestamp: string
}

const maxEventLogs = 100

const formatLogTimestamp = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`

const getWorkspaceOverrideFromEnv = () => {
  const override = process.env.NIT_PLANE_WORKSPACE?.trim()
  if (!override) {
    return null
  }

  return override
}

const applyWorkspaceOverride = (
  config: PlaneConfig,
  workspaceOverride: string | null,
): PlaneConfig => {
  if (!workspaceOverride) {
    return config
  }

  return {
    ...config,
    workspaceUrl: workspaceOverride,
  }
}

const toErrorDetailsText = (value: unknown) => {
  if (value === undefined) {
    return null
  }

  if (typeof value === "string") {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown error"
}

const getWebhookErrorDetails = (error: unknown) => {
  const errorRecord =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : null
  const message = getErrorMessage(error)
  const statusCode =
    typeof errorRecord?.statusCode === "number"
      ? String(errorRecord.statusCode)
      : null
  const responseText = toErrorDetailsText(errorRecord?.response)

  const details = [`Message: ${message}`]
  if (statusCode !== null) {
    details.push(`Status: ${statusCode}`)
  }
  if (responseText) {
    details.push(`Response:\n${responseText}`)
  }

  return details.join("\n")
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

const buildPlaneWebhooksSettingsUrl = (workspaceUrl: string | null) => {
  if (!workspaceUrl) {
    return null
  }

  const workspaceInfo = getWorkspaceInfo(workspaceUrl)
  if (workspaceInfo === null) {
    return null
  }

  return `${workspaceInfo.origin}/${workspaceInfo.slug}/settings/webhooks/`
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
  webhookRefreshTick,
  eventLogs,
  isEventLogsOpen,
  onToggleEventLogs,
  onCloseEventLogs,
  onEventLog,
  onSelectProject,
  webhookStatus,
  webhookStatusDetails,
  isWebhookStatusDetailsOpen,
  onToggleWebhookStatusDetails,
  onCloseWebhookStatusDetails,
  onExit,
}: {
  width: number
  height: number
  selectedProjectId: string | null
  webhookRefreshTick: number
  eventLogs: EventLog[]
  isEventLogsOpen: boolean
  onToggleEventLogs: () => void
  onCloseEventLogs: () => void
  onEventLog: (message: string) => void
  onSelectProject: (projectId: string) => void
  webhookStatus: WebhookStatus
  webhookStatusDetails: string | null
  isWebhookStatusDetailsOpen: boolean
  onToggleWebhookStatusDetails: () => void
  onCloseWebhookStatusDetails: () => void
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
  const previousProjectsRefreshTickRef = useRef(webhookRefreshTick)
  const previousTasksRefreshTickRef = useRef(webhookRefreshTick)
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
    const isWebhookRefresh =
      previousProjectsRefreshTickRef.current !== webhookRefreshTick
    previousProjectsRefreshTickRef.current = webhookRefreshTick

    const loadProjects = async () => {
      if (!isWebhookRefresh) {
        setIsLoadingProjects(true)
        setProjectsError(null)
      } else {
        onEventLog("Webhook refresh: reloading projects in background.")
      }

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

        setProjectsError(null)
        setProjects(nextProjects)
        if (isWebhookRefresh) {
          onEventLog("Webhook refresh: projects updated.")
        }
      } catch (error) {
        if (!isActive) {
          return
        }

        if (isWebhookRefresh) {
          const message =
            error instanceof Error ? error.message : "Unable to load Plane projects."
          onEventLog(`Webhook refresh failed (projects): ${message}`)
          return
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load Plane projects."
        setProjectsError(message)
        setProjects([])
      } finally {
        if (isActive && !isWebhookRefresh) {
          setIsLoadingProjects(false)
        }
      }
    }

    loadProjects()

    return () => {
      isActive = false
    }
  }, [client, onEventLog, webhookRefreshTick, workspaceSlug])

  useEffect(() => {
    if (!activeProjectId || activeProjectId === selectedProjectId) {
      return
    }

    onSelectProject(activeProjectId)
  }, [activeProjectId, onSelectProject, selectedProjectId])

  useEffect(() => {
    let isActive = true
    const isWebhookRefresh =
      previousTasksRefreshTickRef.current !== webhookRefreshTick
    previousTasksRefreshTickRef.current = webhookRefreshTick

    const loadTasks = async () => {
      if (!workspaceSlug || !activeProjectId) {
        setTasks([])
        setTasksError(null)
        setIsLoadingTasks(false)
        return
      }

      if (!isWebhookRefresh) {
        setIsLoadingTasks(true)
        setTasksError(null)
      } else {
        onEventLog("Webhook refresh: reloading tasks in background.")
      }

      try {
        const response = await client.workItems.list(workspaceSlug, activeProjectId, {
          limit: 50,
        })
        const nextTasks = Array.isArray(response.results) ? response.results : []
        if (!isActive) {
          return
        }

        setTasksError(null)
        setTasks(nextTasks)
        if (isWebhookRefresh) {
          onEventLog("Webhook refresh: tasks updated.")
        }
      } catch (error) {
        if (!isActive) {
          return
        }

        if (isWebhookRefresh) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load Plane project tasks."
          onEventLog(`Webhook refresh failed (tasks): ${message}`)
          return
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load Plane project tasks."
        setTasksError(message)
        setTasks([])
      } finally {
        if (isActive && !isWebhookRefresh) {
          setIsLoadingTasks(false)
        }
      }
    }

    loadTasks()

    return () => {
      isActive = false
    }
  }, [activeProjectId, client, onEventLog, webhookRefreshTick, workspaceSlug])

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
    if (isWebhookStatusDetailsOpen && (key.escape || input === "e")) {
      onCloseWebhookStatusDetails()
      return
    }
    if (isEventLogsOpen && (key.escape || input === "l")) {
      onCloseEventLogs()
      return
    }

    if (input === "q") {
      onExit()
      return
    }

    if (input === "c") {
      navigate("/config")
      return
    }

    if (input === "e" && webhookStatusDetails) {
      onToggleWebhookStatusDetails()
      return
    }
    if (input === "l") {
      onToggleEventLogs()
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
      {isWebhookStatusDetailsOpen && webhookStatusDetails ? (
        <Box borderStyle="round" flexDirection="column" paddingX={1}>
          <Text color="red">Webhook Error Details</Text>
          <Text>{webhookStatusDetails}</Text>
          <Text dimColor>Press e or Esc to close.</Text>
        </Box>
      ) : null}
      {isEventLogsOpen ? (
        <Box borderStyle="round" flexDirection="column" paddingX={1}>
          <Text color="cyan">Recent Events</Text>
          {eventLogs.length === 0 ? (
            <Text dimColor>No events yet.</Text>
          ) : (
            eventLogs.map((entry) => (
              <Text key={entry.id}>
                <Text dimColor>[{entry.timestamp}] </Text>
                {entry.message}
              </Text>
            ))
          )}
          <Text dimColor>Press l or Esc to close.</Text>
        </Box>
      ) : null}
      <Box
        height={2}
        paddingX={1}
        flexDirection="column"
      >
        <Text dimColor>
          q:Quit c:Config Up/Down:Select Task
          {isEventLogsOpen ? " l/Esc:Hide Logs" : " l:Logs"}
          {webhookStatusDetails
            ? isWebhookStatusDetailsOpen
              ? " e/Esc:Hide Error"
              : " e:Show Error"
            : ""}
        </Text>
        <Text
          color={
            webhookStatus.tone === "error"
              ? "red"
              : webhookStatus.tone === "success"
                ? "green"
                : undefined
          }
          dimColor={webhookStatus.tone === "info"}
        >
          {webhookStatus.text}
        </Text>
      </Box>
    </Box>
  )
}

const ConfigScreen = ({
  width,
  height,
  planeConfig,
  webhookUrl,
  planeWebhooksSettingsUrl,
  eventLogs,
  isEventLogsOpen,
  onToggleEventLogs,
  onCloseEventLogs,
  setupRequired,
  plane,
  webhookStatus,
  webhookStatusDetails,
  isWebhookStatusDetailsOpen,
  onToggleWebhookStatusDetails,
  onCloseWebhookStatusDetails,
  onSaveConfig,
}: {
  width: number
  height: number
  planeConfig: PlaneConfig
  webhookUrl: string | null
  planeWebhooksSettingsUrl: string | null
  eventLogs: EventLog[]
  isEventLogsOpen: boolean
  onToggleEventLogs: () => void
  onCloseEventLogs: () => void
  setupRequired: boolean
  plane: PlaneContextValue | null
  webhookStatus: WebhookStatus
  webhookStatusDetails: string | null
  isWebhookStatusDetailsOpen: boolean
  onToggleWebhookStatusDetails: () => void
  onCloseWebhookStatusDetails: () => void
  onSaveConfig: (config: {
    workspaceUrl: string
    publicHost: string
    token: string
    webhookSecret: string | null
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
      initialPublicHost={planeConfig.publicHost}
      initialToken={planeConfig.token ?? ""}
      initialWebhookSecret={planeConfig.webhookSecret ?? ""}
      initialSelectedProjectId={planeConfig.selectedProjectId}
      webhookUrl={webhookUrl}
      planeWebhooksSettingsUrl={planeWebhooksSettingsUrl}
      projects={projects}
      isLoadingProjects={isLoadingProjects}
      projectsError={projectsError}
      eventLogs={eventLogs}
      isEventLogsOpen={isEventLogsOpen}
      onToggleEventLogs={onToggleEventLogs}
      onCloseEventLogs={onCloseEventLogs}
      statusLine={webhookStatus}
      statusDetails={webhookStatusDetails}
      isStatusDetailsOpen={isWebhookStatusDetailsOpen}
      onToggleStatusDetails={onToggleWebhookStatusDetails}
      onCloseStatusDetails={onCloseWebhookStatusDetails}
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
  const workspaceOverride = useMemo(() => getWorkspaceOverrideFromEnv(), [])

  const [webhookServerPort, setWebhookServerPort] = useState<number | null>(null)
  const [webhookStatusDetails, setWebhookStatusDetails] = useState<string | null>(
    null,
  )
  const [isWebhookStatusDetailsOpen, setIsWebhookStatusDetailsOpen] =
    useState(false)
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus>({
    text: "Starting webhook server...",
    tone: "info",
  })
  const [webhookRefreshTick, setWebhookRefreshTick] = useState(0)
  const [eventLogs, setEventLogs] = useState<EventLog[]>([])
  const [isEventLogsOpen, setIsEventLogsOpen] = useState(false)
  const [storedPlaneConfig, setStoredPlaneConfig] = useState<PlaneConfig>(() =>
    getPlaneConfig(database),
  )
  const planeConfig = useMemo(
    () => applyWorkspaceOverride(storedPlaneConfig, workspaceOverride),
    [storedPlaneConfig, workspaceOverride],
  )
  const setupRequired = !planeConfig.workspaceUrl || !planeConfig.token

  const appendEventLog = useCallback((message: string) => {
    setEventLogs((current) => {
      const nextEntry: EventLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        timestamp: formatLogTimestamp(new Date()),
        message,
      }
      const next = [...current, nextEntry]
      if (next.length <= maxEventLogs) {
        return next
      }

      return next.slice(next.length - maxEventLogs)
    })
  }, [])

  const handleWebhookEvent = useCallback(
    (event: PlaneWebhookEvent) => {
      if (event.type === "accepted") {
        appendEventLog("Webhook accepted.")
        setWebhookRefreshTick((current) => current + 1)
        return
      }

      if (event.type === "rejected") {
        appendEventLog(
          event.reason === "missing_secret"
            ? "Webhook rejected: secret not configured."
            : "Webhook rejected: invalid signature.",
        )
        return
      }

      appendEventLog("Webhook rejected: invalid request body.")
    },
    [appendEventLog],
  )

  useEffect(() => {
    let isActive = true
    let activeServer: PlaneWebhookServer | null = null

    const startServer = async () => {
      try {
        const nextServer = await startPlaneWebhookServer(database, {
          onWebhookEvent: (event) => {
            if (!isActive) {
              return
            }

            handleWebhookEvent(event)
          },
        })
        if (!isActive) {
          await nextServer.close()
          return
        }

        activeServer = nextServer
        setWebhookServerPort(nextServer.port)
        setWebhookStatusDetails(null)
        setIsWebhookStatusDetailsOpen(false)
        setWebhookStatus({
          text: `Webhook server listening on port ${nextServer.port}.`,
          tone: "info",
        })
        appendEventLog(`Webhook server listening on port ${nextServer.port}.`)
      } catch (error) {
        const message = getErrorMessage(error)
        const details = getWebhookErrorDetails(error)
        console.error("Failed to start Plane webhook server.", error)
        setWebhookStatusDetails(details)
        setIsWebhookStatusDetailsOpen(false)
        setWebhookStatus({
          text: `Webhook server error: ${message}`,
          tone: "error",
        })
        appendEventLog(`Webhook server error: ${message}`)
      }
    }

    void startServer()

    return () => {
      isActive = false
      if (activeServer !== null) {
        void activeServer.close()
      }
    }
  }, [appendEventLog, database, handleWebhookEvent])

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
  const webhookUrlForConfig = useMemo(() => {
    if (webhookServerPort === null) {
      return null
    }

    return buildPlaneWebhookUrl(planeConfig.publicHost, webhookServerPort)
  }, [planeConfig.publicHost, webhookServerPort])
  const planeWebhooksSettingsUrl = useMemo(
    () => buildPlaneWebhooksSettingsUrl(planeConfig.workspaceUrl),
    [planeConfig.workspaceUrl],
  )

  const updatePlaneConfig = useCallback(
    (nextConfig: PlaneConfig) => {
      setStoredPlaneConfig(nextConfig)
      if (!nextConfig.workspaceUrl || !nextConfig.token) {
        return
      }

      savePlaneConfig(database, {
        workspaceUrl: nextConfig.workspaceUrl,
        publicHost: nextConfig.publicHost,
        token: nextConfig.token,
        webhookSecret: nextConfig.webhookSecret,
        selectedProjectId: nextConfig.selectedProjectId,
      })
    },
    [database],
  )

  const updateSelectedProject = useCallback(
    (selectedProjectId: string | null) => {
      if (storedPlaneConfig.selectedProjectId === selectedProjectId) {
        return
      }

      updatePlaneConfig({
        ...storedPlaneConfig,
        selectedProjectId,
      })
    },
    [storedPlaneConfig, updatePlaneConfig],
  )

  const toggleWebhookStatusDetails = useCallback(() => {
    if (webhookStatusDetails === null) {
      return
    }

    setIsWebhookStatusDetailsOpen((current) => !current)
  }, [webhookStatusDetails])

  const closeWebhookStatusDetails = useCallback(() => {
    setIsWebhookStatusDetailsOpen(false)
  }, [])

  const toggleEventLogs = useCallback(() => {
    setIsEventLogsOpen((current) => !current)
  }, [])

  const closeEventLogs = useCallback(() => {
    setIsEventLogsOpen(false)
  }, [])

  const visibleEventLogs = useMemo(() => eventLogs.slice(-8), [eventLogs])

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
                  webhookRefreshTick={webhookRefreshTick}
                  eventLogs={visibleEventLogs}
                  isEventLogsOpen={isEventLogsOpen}
                  onToggleEventLogs={toggleEventLogs}
                  onCloseEventLogs={closeEventLogs}
                  onEventLog={appendEventLog}
                  onSelectProject={(projectId) => {
                    updateSelectedProject(projectId)
                  }}
                  webhookStatus={webhookStatus}
                  webhookStatusDetails={webhookStatusDetails}
                  isWebhookStatusDetailsOpen={isWebhookStatusDetailsOpen}
                  onToggleWebhookStatusDetails={toggleWebhookStatusDetails}
                  onCloseWebhookStatusDetails={closeWebhookStatusDetails}
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
              webhookUrl={webhookUrlForConfig}
              planeWebhooksSettingsUrl={planeWebhooksSettingsUrl}
              eventLogs={visibleEventLogs}
              isEventLogsOpen={isEventLogsOpen}
              onToggleEventLogs={toggleEventLogs}
              onCloseEventLogs={closeEventLogs}
              setupRequired={setupRequired}
              plane={plane}
              webhookStatus={webhookStatus}
              webhookStatusDetails={webhookStatusDetails}
              isWebhookStatusDetailsOpen={isWebhookStatusDetailsOpen}
              onToggleWebhookStatusDetails={toggleWebhookStatusDetails}
              onCloseWebhookStatusDetails={closeWebhookStatusDetails}
              onSaveConfig={({
                workspaceUrl,
                publicHost,
                token,
                webhookSecret,
                selectedProjectId,
              }) => {
                const workspaceChanged =
                  storedPlaneConfig.workspaceUrl !== workspaceUrl ||
                  storedPlaneConfig.token !== token

                updatePlaneConfig({
                  workspaceUrl,
                  publicHost,
                  token,
                  webhookSecret,
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
