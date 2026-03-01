import { FetchMock, defaultFetchMockConfig } from "fetch-mock"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { render } from "ink-testing-library"
import { createElement } from "react"
import { AppWithContext } from "../app.js"
import { openDatabase, savePlaneConfig } from "../db/database.js"
import { cleanupAfterEach } from "./cleanup.js"

type CreateTestAppOptions = {
  planeConfig?: {
    workspaceUrl: string
    token: string
  }
}

export async function createTestApp(options: CreateTestAppOptions = {}) {
  const fetchMock = new FetchMock(defaultFetchMockConfig)
  const fetch: typeof globalThis.fetch = fetchMock.fetchHandler

  cleanupAfterEach.addCleanupStep(() => {
    fetchMock.hardReset()
  })

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nit-agent-loop-test-"))
  const databasePath = path.join(tempDir, "app.sqlite")
  const database = openDatabase(databasePath)

  if (options.planeConfig) {
    savePlaneConfig(database, options.planeConfig)
  }

  cleanupAfterEach.addCleanupStep(() => {
    database.close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  const app = render(
    createElement(AppWithContext, {
      context: {
        database,
        fetch,
        useExit: () => {},
      },
    }),
  )

  cleanupAfterEach.addCleanupStep(() => {
    app.cleanup()
  })

  return {
    app,
    database,
    databasePath,
    fetch,
    fetchMock,
  }
}
