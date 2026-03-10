import { Select, TextInput } from "@inkjs/ui"
import { Box, Text, useInput } from "ink"
import { useEffect, useMemo, useState } from "react"

type ConfigMessage = {
  tone: "error" | "info" | "success"
  text: string
}

type EventLog = {
  id: string
  message: string
  timestamp: string
}

type ConfigField =
  | "workspaceUrl"
  | "publicHost"
  | "token"
  | "webhookSecret"
  | "project"
type ConfigProject = {
  id: string
  name: string
  identifier?: string | null
}
type TextEditField = "workspaceUrl" | "publicHost" | "token" | "webhookSecret"
type EditModalState =
  | {
      kind: TextEditField
    }
  | {
      kind: "project"
      selectedProjectId: string | null
    }

type PlaneConfigScreenProps = {
  width: number
  height: number
  initialWorkspaceUrl: string
  initialPublicHost: string
  initialToken: string
  initialWebhookSecret: string
  initialSelectedProjectId: string | null
  webhookUrl: string | null
  planeWebhooksSettingsUrl: string | null
  projects: ConfigProject[]
  isLoadingProjects: boolean
  projectsError: string | null
  eventLogs?: EventLog[]
  isEventLogsOpen?: boolean
  onToggleEventLogs?: () => void
  onCloseEventLogs?: () => void
  statusLine?: ConfigMessage
  statusDetails?: string | null
  isStatusDetailsOpen?: boolean
  onToggleStatusDetails?: () => void
  onCloseStatusDetails?: () => void
  allowCancel: boolean
  onSave: (config: {
    workspaceUrl: string
    publicHost: string
    token: string
    webhookSecret: string | null
    selectedProjectId: string | null
  }) => void
  onCancel: () => void
}

const normalizeWorkspaceUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null
    }

    url.hash = ""
    return url.toString().replace(/\/+$/, "")
  } catch {
    return null
  }
}

const normalizePublicHost = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return "localhost"
  }

  try {
    const normalizedUrl = new URL(
      trimmed.includes("://") ? trimmed : `http://${trimmed}`,
    )
    if (
      (normalizedUrl.protocol !== "http:" &&
        normalizedUrl.protocol !== "https:") ||
      !normalizedUrl.hostname
    ) {
      return null
    }

    normalizedUrl.pathname = ""
    normalizedUrl.search = ""
    normalizedUrl.hash = ""
    return trimmed.includes("://")
      ? `${normalizedUrl.protocol}//${normalizedUrl.host}`
      : normalizedUrl.host
  } catch {
    return null
  }
}

const maskValue = (value: string) => "*".repeat(value.length)

const fieldOrder: ConfigField[] = [
  "workspaceUrl",
  "publicHost",
  "token",
  "webhookSecret",
  "project",
]

const getProjectLabel = (project: ConfigProject) => {
  return project.identifier
    ? `${project.identifier}: ${project.name}`
    : project.name
}

const getNextField = (current: ConfigField, offset: number): ConfigField => {
  const currentIndex = fieldOrder.indexOf(current)
  const nextIndex =
    (currentIndex + offset + fieldOrder.length) % fieldOrder.length
  return fieldOrder[nextIndex] ?? current
}

const getSelectedProjectIdOrFallback = (
  projects: ConfigProject[],
  selectedProjectId: string | null,
) => {
  if (selectedProjectId && projects.some((project) => project.id === selectedProjectId)) {
    return selectedProjectId
  }

  return projects[0]?.id ?? null
}

export const PlaneConfigScreen = ({
  width,
  height,
  initialWorkspaceUrl,
  initialPublicHost,
  initialToken,
  initialWebhookSecret,
  initialSelectedProjectId,
  webhookUrl,
  planeWebhooksSettingsUrl,
  projects,
  isLoadingProjects,
  projectsError,
  eventLogs = [],
  isEventLogsOpen = false,
  onToggleEventLogs,
  onCloseEventLogs,
  statusLine,
  statusDetails,
  isStatusDetailsOpen = false,
  onToggleStatusDetails,
  onCloseStatusDetails,
  allowCancel,
  onSave,
  onCancel,
}: PlaneConfigScreenProps) => {
  const [workspaceUrlInput, setWorkspaceUrlInput] =
    useState(initialWorkspaceUrl)
  const [publicHostInput, setPublicHostInput] = useState(initialPublicHost)
  const [tokenInput, setTokenInput] = useState(initialToken)
  const [webhookSecretInput, setWebhookSecretInput] = useState(
    initialWebhookSecret,
  )
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialSelectedProjectId,
  )
  const [activeField, setActiveField] = useState<ConfigField>("workspaceUrl")
  const [message, setMessage] = useState<ConfigMessage | null>(null)
  const [editModal, setEditModal] = useState<EditModalState | null>(null)
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  useEffect(() => {
    if (projects.length === 0) {
      return
    }

    setSelectedProjectId((current) =>
      getSelectedProjectIdOrFallback(projects, current),
    )
  }, [projects])

  const openEditor = () => {
    if (activeField === "workspaceUrl") {
      setEditModal({ kind: "workspaceUrl" })
      return
    }

    if (activeField === "token") {
      setEditModal({ kind: "token" })
      return
    }

    if (activeField === "webhookSecret") {
      setEditModal({ kind: "webhookSecret" })
      return
    }

    if (activeField === "publicHost") {
      setEditModal({ kind: "publicHost" })
      return
    }

    setEditModal({
      kind: "project",
      selectedProjectId: getSelectedProjectIdOrFallback(
        projects,
        selectedProjectId,
      ),
    })
  }

  const saveConfig = () => {
    const normalizedWorkspaceUrl = normalizeWorkspaceUrl(workspaceUrlInput)
    if (!normalizedWorkspaceUrl) {
      setMessage({
        tone: "error",
        text: "Please set a valid workspace URL before saving.",
      })
      return
    }

    const normalizedPublicHost = normalizePublicHost(publicHostInput)
    if (!normalizedPublicHost) {
      setMessage({
        tone: "error",
        text: "Please set a valid public host before saving.",
      })
      return
    }

    const normalizedToken = tokenInput.trim()
    if (!normalizedToken) {
      setMessage({
        tone: "error",
        text: "Please set a non-empty token before saving.",
      })
      return
    }
    const normalizedWebhookSecret = webhookSecretInput.trim() || null

    onSave({
      workspaceUrl: normalizedWorkspaceUrl,
      publicHost: normalizedPublicHost,
      token: normalizedToken,
      webhookSecret: normalizedWebhookSecret,
      selectedProjectId,
    })
  }

  useInput((input, key) => {
    if (isStatusDetailsOpen && (key.escape || input === "e")) {
      onCloseStatusDetails?.()
      return
    }
    if (isEventLogsOpen && (key.escape || input === "l")) {
      onCloseEventLogs?.()
      return
    }

    if (editModal !== null) {
      if (key.escape) {
        setEditModal(null)
        return
      }

      if (input === "l") {
        onToggleEventLogs?.()
        return
      }

      if (editModal.kind === "project") {
        return
      }
      return
    }

    if (key.ctrl && input.toLowerCase() === "s") {
      saveConfig()
      return
    }

    if (input === "\u0013") {
      saveConfig()
      return
    }

    if (input === "e" && statusDetails) {
      onToggleStatusDetails?.()
      return
    }
    if (input === "l") {
      onToggleEventLogs?.()
      return
    }

    if (key.tab) {
      setActiveField((current) => getNextField(current, 1))
      return
    }

    if (key.upArrow) {
      setActiveField((current) => getNextField(current, -1))
      return
    }

    if (key.downArrow) {
      setActiveField((current) => getNextField(current, 1))
      return
    }

    if (key.escape && allowCancel) {
      onCancel()
      return
    }

    if (key.return) {
      openEditor()
      return
    }

    setMessage(null)
  })

  const hotKeysLabel = (() => {
    const detailsHotKey =
      statusDetails !== undefined && statusDetails !== null
        ? isStatusDetailsOpen
          ? "  e/Esc:Hide Error"
          : "  e:Show Error"
        : ""
    const logsHotKey = isEventLogsOpen ? "  l/Esc:Hide Logs" : "  l:Logs"

    if (editModal?.kind === "project") {
      return `Up/Down:Select  Enter:Apply  Esc:Cancel${logsHotKey}${detailsHotKey}`
    }
    if (
      editModal?.kind === "workspaceUrl" ||
      editModal?.kind === "publicHost" ||
      editModal?.kind === "token" ||
      editModal?.kind === "webhookSecret"
    ) {
      return `Type text  Enter:Apply  Esc:Cancel${logsHotKey}${detailsHotKey}`
    }
    if (allowCancel) {
      return `Tab/Up/Down:Navigate  Enter:Edit  Ctrl+S:Save  Esc:Back${logsHotKey}${detailsHotKey}`
    }
    return `Tab/Up/Down:Navigate  Enter:Edit  Ctrl+S:Save${logsHotKey}${detailsHotKey}`
  })()

  return (
    <Box width={width} height={height} flexDirection="column">
      <Box flexGrow={1} borderStyle="single" flexDirection="column" padding={1}>
        <Text color="cyan">Configuration</Text>
        <Text color={activeField === "workspaceUrl" ? "green" : undefined}>
          {activeField === "workspaceUrl" ? "> " : "  "}
          Workspace URL:{" "}
          <Text color="yellow">{workspaceUrlInput || "<empty>"}</Text>
        </Text>
        <Text color={activeField === "publicHost" ? "green" : undefined}>
          {activeField === "publicHost" ? "> " : "  "}
          Public Host:{" "}
          <Text color="yellow">{publicHostInput || "<empty>"}</Text>
        </Text>
        <Text color={activeField === "token" ? "green" : undefined}>
          {activeField === "token" ? "> " : "  "}
          Token: <Text color="yellow">{tokenInput ? maskValue(tokenInput) : "<empty>"}</Text>
        </Text>
        <Text color={activeField === "webhookSecret" ? "green" : undefined}>
          {activeField === "webhookSecret" ? "> " : "  "}
          Webhook Secret:{" "}
          <Text color="yellow">
            {webhookSecretInput ? maskValue(webhookSecretInput) : "<empty>"}
          </Text>
        </Text>
        <Text color={activeField === "project" ? "green" : undefined}>
          {activeField === "project" ? "> " : "  "}
          Project:{" "}
          <Text color="yellow">
            {selectedProject
              ? getProjectLabel(selectedProject)
              : selectedProjectId ?? "<empty>"}
          </Text>
        </Text>
        <Text>  Webhook URL: <Text color="yellow">{webhookUrl ?? "<unavailable>"}</Text></Text>
        <Text>
          {"  "}Plane Webhooks Page:{" "}
          <Text color="yellow">
            {planeWebhooksSettingsUrl ?? "<unavailable>"}
          </Text>
        </Text>
        <Text dimColor>
          Add the webhook URL in Plane and paste generated secret here.
        </Text>
        {message ? (
          <Text color={message.tone === "error" ? "red" : "yellow"}>
            {message.text}
          </Text>
        ) : (
          <Text dimColor>Press Enter to edit selected field.</Text>
        )}
        <Text dimColor>Configuration is stored in data/app.sqlite.</Text>

        {editModal ? (
          <Box marginTop={1} borderStyle="round" flexDirection="column" padding={1}>
            {editModal.kind === "workspaceUrl" ? (
              <>
                <Text color="cyan">Edit Workspace URL</Text>
                <TextInput
                  defaultValue={workspaceUrlInput}
                  placeholder="https://app.plane.so/my-team"
                  onSubmit={(value) => {
                    setWorkspaceUrlInput(value)
                    setEditModal(null)
                  }}
                />
              </>
            ) : null}
            {editModal.kind === "token" ? (
              <>
                <Text color="cyan">Edit Token</Text>
                <TextInput
                  defaultValue={tokenInput}
                  placeholder="Plane token"
                  onSubmit={(value) => {
                    setTokenInput(value)
                    setEditModal(null)
                  }}
                />
              </>
            ) : null}
            {editModal.kind === "webhookSecret" ? (
              <>
                <Text color="cyan">Edit Webhook Secret</Text>
                <TextInput
                  defaultValue={webhookSecretInput}
                  placeholder="Plane webhook secret"
                  onSubmit={(value) => {
                    setWebhookSecretInput(value)
                    setEditModal(null)
                  }}
                />
              </>
            ) : null}
            {editModal.kind === "publicHost" ? (
              <>
                <Text color="cyan">Edit Public Host</Text>
                <TextInput
                  defaultValue={publicHostInput}
                  placeholder="localhost"
                  onSubmit={(value) => {
                    setPublicHostInput(value)
                    setEditModal(null)
                  }}
                />
              </>
            ) : null}
            {editModal.kind === "project" ? (
              <>
                <Text color="cyan">Select Project</Text>
                {isLoadingProjects ? (
                  <Text dimColor>Loading projects...</Text>
                ) : null}
                {projectsError ? (
                  <Text color="red">{projectsError}</Text>
                ) : null}
                {!isLoadingProjects && !projectsError && projects.length === 0 ? (
                  <Text dimColor>No projects available.</Text>
                ) : null}
                {!isLoadingProjects && !projectsError
                  ? (
                      <Select
                        options={projects.map((project) => ({
                          label: getProjectLabel(project),
                          value: project.id,
                        }))}
                        defaultValue={editModal.selectedProjectId ?? undefined}
                        onChange={(value) => {
                          setSelectedProjectId(value)
                          setEditModal(null)
                        }}
                      />
                    )
                  : null}
                <Text dimColor>Enter:Apply Esc:Cancel</Text>
              </>
            ) : null}
          </Box>
        ) : null}
        {isStatusDetailsOpen && statusDetails ? (
          <Box marginTop={1} borderStyle="round" flexDirection="column" padding={1}>
            <Text color="red">Webhook Error Details</Text>
            <Text>{statusDetails}</Text>
            <Text dimColor>Press e or Esc to close.</Text>
          </Box>
        ) : null}
        {isEventLogsOpen ? (
          <Box marginTop={1} borderStyle="round" flexDirection="column" padding={1}>
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
      </Box>
      <Box height={statusLine ? 2 : 1} paddingX={1} flexDirection="column">
        <Text dimColor>{hotKeysLabel}</Text>
        {statusLine ? (
          <Text
            color={
              statusLine.tone === "error"
                ? "red"
                : statusLine.tone === "success"
                  ? "green"
                  : undefined
            }
            dimColor={statusLine.tone === "info"}
          >
            {statusLine.text}
          </Text>
        ) : null}
      </Box>
    </Box>
  )
}
