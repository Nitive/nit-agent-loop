import process from "node:process"
import { render, Text, useApp, useInput } from "ink"
import { useEffect } from "react"

const exitSignals = ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"] as const

const App = () => {
  const { exit } = useApp()

  useInput((input, key) => {
    if (key.ctrl && (input === "c" || input === "d")) {
      exit()
    }
  })

  useEffect(() => {
    const handleSignal = () => {
      exit()
    }
    const handleStdinEnd = () => {
      exit()
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
  }, [exit])

  return <Text color="green">Hello world</Text>
}

render(<App />, { exitOnCtrlC: false })
