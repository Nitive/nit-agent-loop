import AxiosMockAdapter from "axios-mock-adapter"
import { FetchMock, defaultFetchMockConfig } from "fetch-mock"
import fsp from "node:fs/promises"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { render } from "ink-testing-library"
import { createElement } from "react"
import { AppWithContext } from "../app.js"
import {
  createAppContextValue,
  createManagedDatabase,
} from "../utils/app-context.js"
import { cleanupAfterEach } from "./cleanup.js"
import {
  sleep,
  waitForStableFrame,
  type WaitForStableFrameOptions,
  writeInput,
} from "./wait.js"

type CreateTestAppOptions = {
  path?: string
}

export async function createTestApp(options: CreateTestAppOptions = {}) {
  const requireFromHere = createRequire(import.meta.url)
  const planeSdkRequire = createRequire(
    requireFromHere.resolve(
      "@makeplane/plane-node-sdk/dist/api/BaseResource.js",
    ),
  )
  const planeSdkAxios = planeSdkRequire("axios") as import("axios").AxiosStatic
  const axiosMock = new AxiosMockAdapter(planeSdkAxios)
  const fetchMock = new FetchMock(defaultFetchMockConfig)
  const fetch: typeof globalThis.fetch = fetchMock.fetchHandler

  cleanupAfterEach.addCleanupStep(() => {
    axiosMock.reset()
    axiosMock.restore()
  })

  cleanupAfterEach.addCleanupStep(() => {
    fetchMock.hardReset()
  })

  const tempDir =
    options.path ??
    (await fsp.mkdtemp(path.join(os.tmpdir(), "nit-agent-loop-test-")))

  async function cleanupTestDir() {
    await fsp.rm(tempDir, { recursive: true, force: true })
  }

  const databasePath = path.join(tempDir, "app.sqlite")

  await fsp.mkdir(tempDir, { recursive: true })
  const managedDatabase = createManagedDatabase(databasePath)
  const { database } = managedDatabase

  const app = render(
    createElement(AppWithContext, {
      context: createAppContextValue({
        database,
        fetch,
        useExit: () => {},
      }),
    }),
  )

  let isDestroyed = false
  const destroy = async (opts: { keepFiles?: boolean } = {}) => {
    if (isDestroyed) {
      return
    }

    isDestroyed = true
    app.cleanup()
    managedDatabase.close()
    if (!opts.keepFiles) {
      await cleanupTestDir()
    }
  }

  cleanupAfterEach.addCleanupStep(async () => {
    await destroy()
    await cleanupTestDir()
  })

  return {
    app,
    database,
    destroy,
    tempDir,
    fetch,
    fetchMock,
    axiosMock,
    lastFrame: () => app.lastFrame() ?? "",
    sleep,
    waitForStableFrame: (options?: WaitForStableFrameOptions) =>
      waitForStableFrame(app, options),
    writeInput: (value: string, stableFrames?: number) =>
      writeInput(app, value, stableFrames),
    write: (value: string) => app.stdin.write(value),
  }
}
