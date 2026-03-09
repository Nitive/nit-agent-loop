import { Select, TextInput } from "@inkjs/ui"
import { Box, Text, useInput } from "ink"
import { useEffect, useMemo, useState } from "react"

type ConfigMessage = {
  tone: "error" | "info"
  text: string
}

type ConfigField = "workspaceUrl" | "token" | "project"
type ConfigProject = {
  id: string
  name: string
  identifier?: string | null
}
type TextEditField = "workspaceUrl" | "token"
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
  initialToken: string
  initialSelectedProjectId: string | null
  projects: ConfigProject[]
  isLoadingProjects: boolean
  projectsError: string | null
  allowCancel: boolean
  onSave: (config: {
    workspaceUrl: string
    token: string
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

const maskValue = (value: string) => "*".repeat(value.length)

const fieldOrder: ConfigField[] = ["workspaceUrl", "token", "project"]

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
  initialToken,
  initialSelectedProjectId,
  projects,
  isLoadingProjects,
  projectsError,
  allowCancel,
  onSave,
  onCancel,
}: PlaneConfigScreenProps) => {
  const [workspaceUrlInput, setWorkspaceUrlInput] =
    useState(initialWorkspaceUrl)
  const [tokenInput, setTokenInput] = useState(initialToken)
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

    const normalizedToken = tokenInput.trim()
    if (!normalizedToken) {
      setMessage({
        tone: "error",
        text: "Please set a non-empty token before saving.",
      })
      return
    }

    onSave({
      workspaceUrl: normalizedWorkspaceUrl,
      token: normalizedToken,
      selectedProjectId,
    })
  }

  useInput((input, key) => {
    if (editModal !== null) {
      if (key.escape) {
        setEditModal(null)
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
    if (editModal?.kind === "project") {
      return "Up/Down:Select  Enter:Apply  Esc:Cancel"
    }
    if (editModal?.kind === "workspaceUrl" || editModal?.kind === "token") {
      return "Type text  Enter:Apply  Esc:Cancel"
    }
    if (allowCancel) {
      return "Tab/Up/Down:Navigate  Enter:Edit  Ctrl+S:Save  Esc:Back"
    }
    return "Tab/Up/Down:Navigate  Enter:Edit  Ctrl+S:Save"
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
        <Text color={activeField === "token" ? "green" : undefined}>
          {activeField === "token" ? "> " : "  "}
          Token: <Text color="yellow">{tokenInput ? maskValue(tokenInput) : "<empty>"}</Text>
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
      </Box>
      <Box height={1} paddingX={1}>
        <Text dimColor>{hotKeysLabel}</Text>
      </Box>
    </Box>
  )
}
