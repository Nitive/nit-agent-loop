import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  getMetaValue,
  getPlaneConfig,
  getWebhookServerPort,
  openDatabase,
  savePlaneConfig,
  saveWebhookServerPort,
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

    expect(getPlaneConfig(database).publicHost).toBe("localhost")
    expect(getPlaneConfig(database).webhookSecret).toBeNull()

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
      publicHost: "localhost",
      token: "token-123",
      webhookSecret: "secret-123",
      selectedProjectId: "project-2",
    })
    expect(getPlaneConfig(database).selectedProjectId).toBe("project-2")
    expect(getPlaneConfig(database).publicHost).toBe("localhost")
    expect(getPlaneConfig(database).webhookSecret).toBe("secret-123")

    savePlaneConfig(database, {
      workspaceUrl: "https://plane.example.com/my-team",
      publicHost: "public.example.com",
      token: "token-123",
      webhookSecret: null,
      selectedProjectId: null,
    })
    expect(getPlaneConfig(database).selectedProjectId).toBeNull()
    expect(getPlaneConfig(database).publicHost).toBe("public.example.com")
    expect(getPlaneConfig(database).webhookSecret).toBeNull()

    database.close()
  })

  it("stores webhook server port metadata", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "nit-agent-loop-test-"),
    )
    cleanupAfterEach.addCleanupStep(async () => {
      await fsp.rm(tempDir, { recursive: true, force: true })
    })

    const databasePath = path.join(tempDir, "app.sqlite")
    const database = openDatabase(databasePath)

    expect(getWebhookServerPort(database)).toBeNull()
    saveWebhookServerPort(database, 40123)
    expect(getWebhookServerPort(database)).toBe(40123)

    database.close()
  })
})
