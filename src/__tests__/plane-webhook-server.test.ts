import fsp from "node:fs/promises"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { Webhook } from "svix"
import { describe, expect, it } from "vitest"
import {
  getWebhookServerPort,
  openDatabase,
  savePlaneConfig,
  saveWebhookServerPort,
} from "../db/database.js"
import {
  planeWebhookPath,
  startPlaneWebhookServer,
} from "../server/plane-webhook-server.js"
import { cleanupAfterEach } from "../test-helpers/cleanup.js"

const listenOnRandomPort = async (server: http.Server) =>
  new Promise<number>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        reject(new Error("Unable to resolve blocked test server port."))
        return
      }

      resolve(address.port)
    })
    server.once("error", reject)
  })

const closeServer = async (server: http.Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })

const waitForNextTick = async () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })

const defaultWebhookSecret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"

const createSvixHeaders = (secret: string, payload: string) => {
  const msgId = `msg_${Math.random().toString(36).slice(2, 12)}`
  const timestamp = new Date()
  const webhook = new Webhook(secret)

  return {
    "svix-id": msgId,
    "svix-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
    "svix-signature": webhook.sign(msgId, timestamp, payload),
  }
}

describe("plane webhook server", () => {
  it("falls back to a random port when the persisted port is already in use", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "nit-agent-loop-test-"),
    )
    cleanupAfterEach.addCleanupStep(async () => {
      await fsp.rm(tempDir, { recursive: true, force: true })
    })

    const blocker = http.createServer((_request, response) => {
      response.statusCode = 200
      response.end("ok")
    })

    const blockedPort = await listenOnRandomPort(blocker)
    cleanupAfterEach.addCleanupStep(async () => {
      await closeServer(blocker)
    })

    const database = openDatabase(path.join(tempDir, "app.sqlite"))
    cleanupAfterEach.addCleanupStep(() => {
      database.close()
    })

    saveWebhookServerPort(database, blockedPort)

    const server = await startPlaneWebhookServer(database)
    cleanupAfterEach.addCleanupStep(async () => {
      await server.close()
    })

    expect(server.port).not.toBe(blockedPort)
    expect(getWebhookServerPort(database)).toBe(server.port)

    const response = await fetch(`http://127.0.0.1:${server.port}/healthz`)
    expect(response.status).toBe(200)
  })

  it("accepts webhook payload only when signature is valid", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "nit-agent-loop-test-"),
    )
    cleanupAfterEach.addCleanupStep(async () => {
      await fsp.rm(tempDir, { recursive: true, force: true })
    })

    const database = openDatabase(path.join(tempDir, "app.sqlite"))
    cleanupAfterEach.addCleanupStep(() => {
      database.close()
    })
    savePlaneConfig(database, {
      workspaceUrl: "https://plane.example.com/my-team",
      publicHost: "localhost",
      token: "token-123",
      webhookSecret: defaultWebhookSecret,
      selectedProjectId: null,
    })

    let acceptedWebhookCount = 0
    let rejectedWebhookCount = 0
    const server = await startPlaneWebhookServer(database, {
      onWebhookEvent: (event) => {
        if (event.type === "accepted") {
          acceptedWebhookCount += 1
          return
        }

        if (event.type === "rejected") {
          rejectedWebhookCount += 1
        }
      },
    })
    cleanupAfterEach.addCleanupStep(async () => {
      await server.close()
    })

    const payload = JSON.stringify({ event: "issue.updated" })
    const validHeaders = createSvixHeaders(defaultWebhookSecret, payload)

    const validResponse = await fetch(
      `http://127.0.0.1:${server.port}${planeWebhookPath}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...validHeaders,
        },
        body: payload,
      },
    )
    expect(validResponse.status).toBe(200)
    await waitForNextTick()
    expect(acceptedWebhookCount).toBe(1)
    expect(rejectedWebhookCount).toBe(0)

    const invalidResponse = await fetch(
      `http://127.0.0.1:${server.port}${planeWebhookPath}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...validHeaders,
          "svix-signature": "v1,deadbeef",
        },
        body: payload,
      },
    )
    expect(invalidResponse.status).toBe(403)
    await waitForNextTick()
    expect(acceptedWebhookCount).toBe(1)
    expect(rejectedWebhookCount).toBe(1)
  })

  it("rejects webhook payload when secret is not configured", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "nit-agent-loop-test-"),
    )
    cleanupAfterEach.addCleanupStep(async () => {
      await fsp.rm(tempDir, { recursive: true, force: true })
    })

    const database = openDatabase(path.join(tempDir, "app.sqlite"))
    cleanupAfterEach.addCleanupStep(() => {
      database.close()
    })
    savePlaneConfig(database, {
      workspaceUrl: "https://plane.example.com/my-team",
      publicHost: "localhost",
      token: "token-123",
      webhookSecret: null,
      selectedProjectId: null,
    })

    const server = await startPlaneWebhookServer(database)
    cleanupAfterEach.addCleanupStep(async () => {
      await server.close()
    })

    const response = await fetch(`http://127.0.0.1:${server.port}${planeWebhookPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...createSvixHeaders(defaultWebhookSecret, JSON.stringify({ event: "issue.updated" })),
      },
      body: JSON.stringify({ event: "issue.updated" }),
    })
    expect(response.status).toBe(503)
  })
})
