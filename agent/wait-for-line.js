#!/usr/bin/env node

import { spawn } from "node:child_process"

const args = process.argv.slice(2)
const separatorIndex = args.indexOf("--")

if (separatorIndex <= 0) {
  console.error(
    'Usage: node ./agent/wait-for-line.js "<line>" -- <command> [args...]',
  )
  process.exit(1)
}

const targetLine = args.slice(0, separatorIndex).join(" ").trim()
const commandArgs = args.slice(separatorIndex + 1)

if (targetLine.length === 0 || commandArgs.length === 0) {
  console.error(
    'Usage: node ./agent/wait-for-line.js "<line>" -- <command> [args...]',
  )
  process.exit(1)
}

console.log("$", commandArgs.join(" "))
const child = spawn(process.env.SHELL, ["-c", commandArgs.join(" ")], {
  stdio: ["ignore", "pipe", "pipe"],
})

let foundTarget = false

const checkLine = (line) => {
  if (foundTarget) {
    return
  }

  if (line.trim() === targetLine) {
    foundTarget = true

    if (!child.killed) {
      child.kill("SIGTERM")
    }

    // Ensure we do not hang if the child ignores SIGTERM.
    setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGKILL")
      }
    }, 1000).unref()
  }
}

const createLineHandler = (stream, output) => {
  let buffer = ""

  stream.setEncoding("utf8")

  stream.on("data", (chunk) => {
    output.write(chunk)
    buffer += chunk

    let newlineIndex = buffer.indexOf("\n")
    while (newlineIndex >= 0) {
      const rawLine = buffer.slice(0, newlineIndex)
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine
      checkLine(line)
      buffer = buffer.slice(newlineIndex + 1)
      newlineIndex = buffer.indexOf("\n")
    }
  })

  stream.on("end", () => {
    if (buffer.length > 0) {
      checkLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer)
    }
  })
}

if (child.stdout) {
  createLineHandler(child.stdout, process.stdout)
}

if (child.stderr) {
  createLineHandler(child.stderr, process.stderr)
}

child.on("error", (error) => {
  console.error(
    `Failed to start command "${commandArgs.join(" ")}": ${error.message}`,
  )
  process.exit(1)
})

child.on("close", (code, signal) => {
  if (foundTarget) {
    process.exit(0)
  }

  if (signal) {
    console.error(
      `Command exited before matching "${targetLine}" (signal: ${signal}).`,
    )
    process.exit(1)
  }

  if (code !== 0) {
    console.error(
      `Command exited before matching "${targetLine}" (exit code: ${code}).`,
    )
    process.exit(code ?? 1)
  }

  console.error(`Command exited before matching "${targetLine}".`)
  process.exit(1)
})
;["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal)
    }
  })
})
