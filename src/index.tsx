import process from "node:process"
import { Box, render, Text, useApp, useInput } from "ink"
import { useState } from "react"
import { getPlaneConfig, savePlaneConfig } from "./db/database.js"
import { useAppContext } from "./hooks/appContext.js"

type SetupStep = "workspaceUrl" | "token" | "done"

type SetupMessage = {
  tone: "error" | "info" | "success"
  text: string
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

const App = () => {
  const { database, useExit } = useAppContext()
  useExit()

  const [initialPlaneConfig] = useState(() => getPlaneConfig(database))
  const [workspaceUrlInput, setWorkspaceUrlInput] = useState(
    initialPlaneConfig.workspaceUrl ?? "",
  )
  const [tokenInput, setTokenInput] = useState(initialPlaneConfig.token ?? "")
  const [setupStep, setSetupStep] = useState<SetupStep>(() => {
    if (!initialPlaneConfig.workspaceUrl) {
      return "workspaceUrl"
    }

    if (!initialPlaneConfig.token) {
      return "token"
    }

    return "done"
  })
  const [setupMessage, setSetupMessage] = useState<SetupMessage | null>(null)

  const setupRequired = setupStep !== "done"

  useInput(
    (input, key) => {
      if (key.return) {
        if (setupStep === "workspaceUrl") {
          const normalizedWorkspaceUrl =
            normalizeWorkspaceUrl(workspaceUrlInput)
          if (!normalizedWorkspaceUrl) {
            setSetupMessage({
              tone: "error",
              text: "Please enter a valid Plane workspace URL (http/https).",
            })
            return
          }

          setWorkspaceUrlInput(normalizedWorkspaceUrl)
          if (tokenInput.trim()) {
            savePlaneConfig(database, {
              workspaceUrl: normalizedWorkspaceUrl,
              token: tokenInput.trim(),
            })
            setSetupStep("done")
            setSetupMessage({
              tone: "success",
              text: "Plane configuration saved to the local database.",
            })
            return
          }

          setSetupStep("token")
          setSetupMessage({
            tone: "info",
            text: "Now enter your Plane token and press Enter.",
          })
          return
        }

        if (setupStep === "token") {
          const normalizedWorkspaceUrl =
            normalizeWorkspaceUrl(workspaceUrlInput)
          const normalizedToken = tokenInput.trim()
          if (!normalizedWorkspaceUrl) {
            setSetupStep("workspaceUrl")
            setSetupMessage({
              tone: "error",
              text: "Workspace URL is missing or invalid. Please enter it again.",
            })
            return
          }
          if (!normalizedToken) {
            setSetupMessage({
              tone: "error",
              text: "Please enter a non-empty Plane token.",
            })
            return
          }

          savePlaneConfig(database, {
            workspaceUrl: normalizedWorkspaceUrl,
            token: normalizedToken,
          })
          setWorkspaceUrlInput(normalizedWorkspaceUrl)
          setTokenInput(normalizedToken)
          setSetupStep("done")
          setSetupMessage({
            tone: "success",
            text: "Plane configuration saved to the local database.",
          })
        }

        return
      }

      if (key.backspace || key.delete) {
        if (setupStep === "workspaceUrl") {
          setWorkspaceUrlInput((current) => current.slice(0, -1))
        }

        if (setupStep === "token") {
          setTokenInput((current) => current.slice(0, -1))
        }
        return
      }

      if (key.ctrl || key.meta || !input) {
        return
      }

      if (setupStep === "workspaceUrl") {
        setWorkspaceUrlInput((current) => current + input)
      }

      if (setupStep === "token") {
        setTokenInput((current) => current + input)
      }
      if (setupMessage?.tone === "error") {
        setSetupMessage(null)
      }
    },
    { isActive: setupRequired },
  )

  const width = process.stdout.columns || 80
  const height = process.stdout.rows || 24

  if (setupRequired) {
    const activeInput =
      setupStep === "workspaceUrl" ? workspaceUrlInput : tokenInput
    const messageColor =
      setupMessage?.tone === "error"
        ? "red"
        : setupMessage?.tone === "success"
          ? "green"
          : "yellow"

    return (
      <Box width={width} height={height} flexDirection="row">
        <Box
          width="50%"
          height="100%"
          borderStyle="single"
          flexDirection="column"
          padding={1}
        >
          <Text color="cyan">Plane Setup</Text>
          <Text>
            {setupStep === "workspaceUrl"
              ? "Enter Plane workspace URL:"
              : "Enter Plane token:"}
          </Text>
          <Text color="yellow">
            {setupStep === "token"
              ? maskValue(activeInput)
              : activeInput || "<empty>"}
          </Text>
          <Text dimColor>Press Enter to continue.</Text>
          <Text dimColor>Configuration is stored in data/app.sqlite.</Text>
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
          {setupMessage ? (
            <Text color={messageColor}>{setupMessage.text}</Text>
          ) : null}
        </Box>
      </Box>
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
        <Text dimColor>q:Quit</Text>
      </Box>
    </Box>
  )
}

render(<App />)
