import process from "node:process"
import { useApp, useInput } from "ink"
import { useCallback, useEffect, useRef } from "react"

const exitSignals = ["SIGTERM", "SIGHUP", "SIGQUIT"] as const

export const useExitHandlers = (onExit?: () => void) => {
  const { exit } = useApp()
  const hasExitedRef = useRef(false)

  const exitWithCleanup = useCallback(() => {
    if (hasExitedRef.current) {
      return
    }

    hasExitedRef.current = true
    onExit?.()
    exit()
  }, [exit, onExit])

  useInput((input, key) => {
    if (key.ctrl && input === "d") {
      exitWithCleanup()
    }
  })

  useEffect(() => {
    const handleSignal = () => {
      exitWithCleanup()
    }
    const handleStdinEnd = () => {
      exitWithCleanup()
    }

    for (const signal of exitSignals) {
      process.once(signal, handleSignal)
    }
    process.stdin.once("end", handleStdinEnd)
    process.stdin.once("close", handleStdinEnd)

    return () => {
      for (const signal of exitSignals) {
        process.removeListener(signal, handleSignal)
      }
      process.stdin.removeListener("end", handleStdinEnd)
      process.stdin.removeListener("close", handleStdinEnd)
    }
  }, [exitWithCleanup])

  useEffect(() => {
    return () => {
      if (hasExitedRef.current) {
        return
      }

      hasExitedRef.current = true
      onExit?.()
    }
  }, [onExit])
}
