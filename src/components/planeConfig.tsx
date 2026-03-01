import { Box, Text, useInput } from "ink"
import { useState } from "react"

type ConfigMessage = {
  tone: "error" | "info"
  text: string
}

type ConfigField = "workspaceUrl" | "token"

type PlaneConfigScreenProps = {
  width: number
  height: number
  initialWorkspaceUrl: string
  initialToken: string
  allowCancel: boolean
  onSave: (config: { workspaceUrl: string; token: string }) => void
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

export const PlaneConfigScreen = ({
  width,
  height,
  initialWorkspaceUrl,
  initialToken,
  allowCancel,
  onSave,
  onCancel,
}: PlaneConfigScreenProps) => {
  const [workspaceUrlInput, setWorkspaceUrlInput] =
    useState(initialWorkspaceUrl)
  const [tokenInput, setTokenInput] = useState(initialToken)
  const [activeField, setActiveField] = useState<ConfigField>("workspaceUrl")
  const [message, setMessage] = useState<ConfigMessage | null>(null)

  useInput((input, key) => {
    if (key.tab || key.upArrow || key.downArrow) {
      setActiveField((current) =>
        current === "workspaceUrl" ? "token" : "workspaceUrl",
      )
      return
    }

    if (key.escape && allowCancel) {
      onCancel()
      return
    }

    if (key.return) {
      const normalizedWorkspaceUrl = normalizeWorkspaceUrl(workspaceUrlInput)
      if (!normalizedWorkspaceUrl) {
        setMessage({
          tone: "error",
          text: "Please enter a valid Plane workspace URL (http/https).",
        })
        return
      }

      const normalizedToken = tokenInput.trim()
      if (!normalizedToken) {
        setMessage({
          tone: "error",
          text: "Please enter a non-empty Plane token.",
        })
        return
      }

      onSave({ workspaceUrl: normalizedWorkspaceUrl, token: normalizedToken })
      return
    }

    if (key.backspace || key.delete) {
      if (activeField === "workspaceUrl") {
        setWorkspaceUrlInput((current) => current.slice(0, -1))
      } else {
        setTokenInput((current) => current.slice(0, -1))
      }
      return
    }

    if (key.ctrl || key.meta || !input) {
      return
    }

    if (activeField === "workspaceUrl") {
      setWorkspaceUrlInput((current) => current + input)
    } else {
      setTokenInput((current) => current + input)
    }

    if (message?.tone === "error") {
      setMessage(null)
    }
  })

  const hotKeysLabel = allowCancel
    ? "Tab:Next field  Enter:Save  Esc:Back"
    : "Tab:Next field  Enter:Save"

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
          <Text color="cyan">Plane Configuration</Text>
          <Text color={activeField === "workspaceUrl" ? "green" : undefined}>
            {activeField === "workspaceUrl" ? "> " : "  "}
            Workspace URL:
          </Text>
          <Text color="yellow">{workspaceUrlInput || "<empty>"}</Text>
          <Text color={activeField === "token" ? "green" : undefined}>
            {activeField === "token" ? "> " : "  "}
            Token:
          </Text>
          <Text color="yellow">
            {tokenInput ? maskValue(tokenInput) : "<empty>"}
          </Text>
        </Box>
        <Box
          width="50%"
          height="100%"
          borderStyle="single"
          flexDirection="column"
          padding={1}
        >
          <Text color="cyan">Current Values</Text>
          <Text>Workspace URL: {workspaceUrlInput.trim() || "<not set>"}</Text>
          <Text>
            Token:{" "}
            {tokenInput.trim() ? maskValue(tokenInput.trim()) : "<not set>"}
          </Text>
          {message ? (
            <Text color={message.tone === "error" ? "red" : "yellow"}>
              {message.text}
            </Text>
          ) : (
            <Text dimColor>Press Enter to save.</Text>
          )}
          <Text dimColor>Configuration is stored in data/app.sqlite.</Text>
        </Box>
      </Box>
      <Box height={1} paddingX={1}>
        <Text dimColor>{hotKeysLabel}</Text>
      </Box>
    </Box>
  )
}
