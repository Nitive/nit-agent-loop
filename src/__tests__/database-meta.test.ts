import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  getMetaValue,
  getPlaneConfig,
  openDatabase,
  savePlaneConfig,
  setMetaValue,
} from "../db/database.js"
import { cleanupAfterEach } from "../test-helpers/cleanup.js"

describe("database metadata", () => {
  it("stores and reads values from an isolated sqlite file", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "nit-agent-loop-test-"),
    )
    cleanupAfterEach.addCleanupStep(async () => {
      await fsp.rm(tempDir, { recursive: true, force: true })
    })

    const databasePath = path.join(tempDir, "app.sqlite")
    const database = openDatabase(databasePath)

    setMetaValue(database, "test.key", "value-1")
    expect(getMetaValue(database, "test.key")).toBe("value-1")

    database.close()
  })

  it("stores selected project as part of plane config", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "nit-agent-loop-test-"),
    )
    cleanupAfterEach.addCleanupStep(async () => {
      await fsp.rm(tempDir, { recursive: true, force: true })
    })

    const databasePath = path.join(tempDir, "app.sqlite")
    const database = openDatabase(databasePath)

    savePlaneConfig(database, {
      workspaceUrl: "https://plane.example.com/my-team",
      token: "token-123",
      selectedProjectId: "project-2",
    })
    expect(getPlaneConfig(database).selectedProjectId).toBe("project-2")

    savePlaneConfig(database, {
      workspaceUrl: "https://plane.example.com/my-team",
      token: "token-123",
      selectedProjectId: null,
    })
    expect(getPlaneConfig(database).selectedProjectId).toBeNull()

    database.close()
  })
})
