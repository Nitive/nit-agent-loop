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
    if (key.ctrl && input === "d" || input === "q") {
      exitWithCleanup()
    }
  })

  useEffect(() => {
    for (const signal of exitSignals) {
      process.once(signal, exitWithCleanup)
    }
    process.stdin.once("end", exitWithCleanup)
    process.stdin.once("close", exitWithCleanup)

    return () => {
      for (const signal of exitSignals) {
        process.removeListener(signal, exitWithCleanup)
      }
      process.stdin.removeListener("end", exitWithCleanup)
      process.stdin.removeListener("close", exitWithCleanup)
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
