import { Webhook } from "svix"
import { describe, expect, it } from "vitest"
import { getPlaneConfig, getWebhookServerPort } from "../db/database.js"
import { planeWebhookPath } from "../server/plane-webhook-server.js"
import { createTestApp } from "../test-helpers/app.js"

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

describe("app projects list", () => {
  it("renders project tasks and selected task details", async () => {
    const previousWorkspaceOverride = process.env.NIT_PLANE_WORKSPACE
    delete process.env.NIT_PLANE_WORKSPACE
    const t = await createTestApp()

    try {
      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Configuration")
        },
      })

      t.axiosMock
        .onGet("https://plane.example.com/api/v1/workspaces/my-team/projects/")
        .reply(200, {
          results: [
            {
              id: "project-1",
              identifier: "ALPHA",
              name: "Project Alpha",
            },
            {
              id: "project-2",
              name: "Project Beta",
            },
          ],
        })
      t.axiosMock
        .onGet(
          "https://plane.example.com/api/v1/workspaces/my-team/projects/project-1/work-items/",
        )
        .reply(200, {
          results: [
            {
              id: "task-1",
              sequence_id: 101,
              name: "Alpha backlog task",
              project: "project-1",
              priority: "medium",
              state: "todo",
            },
          ],
        })
      t.axiosMock
        .onGet(
          "https://plane.example.com/api/v1/workspaces/my-team/projects/project-2/work-items/",
        )
        .reply(200, {
          results: [
            {
              id: "task-2",
              sequence_id: 202,
              name: "Beta first task",
              project: "project-2",
              priority: "high",
              state: "in-progress",
              assignees: ["user-1"],
              description_stripped: "Investigate production incident",
            },
            {
              id: "task-3",
              sequence_id: 203,
              name: "Beta second task",
              project: "project-2",
              priority: "low",
              state: "backlog",
              assignees: [],
              description_stripped: "Prepare release checklist",
            },
          ],
        })

      await t.writeInput("\r")
      await t.writeInput("https://plane.example.com/my-team")
      await t.writeInput("\r")
      await t.writeInput("\t")
      await t.writeInput("\t")
      await t.writeInput("\r")
      await t.writeInput("plane-token-123")
      await t.writeInput("\r")
      await t.writeInput("\u0013")

      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Project Tasks")
          expect(frame).toContain("ALPHA: Project")
          expect(frame).toContain("#101 Alpha")
          expect(frame).toContain("Task Details")
          expect(frame).toContain("ALPHA-101")
          expect(frame).toContain("q:Quit c:Config Up/Down:Select Task")
        },
      })

      await t.writeInput("c")
      await t.writeInput("\t")
      await t.writeInput("\t")
      await t.writeInput("\t")
      await t.writeInput("\t")
      await t.writeInput("\r")
      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Select Project")
          expect(frame).toContain("Public Host:")
          expect(frame).toContain("Webhook URL:")
          expect(frame).toContain("/plane/webhook")
          expect(frame).toContain("Plane Webhooks Page:")
          expect(frame).toContain(
            "https://plane.example.com/my-team/settings/webhooks/",
          )
          expect(frame).toContain("ALPHA: Project Alpha")
        },
      })

      await t.writeInput("\u001B[B")
      await t.writeInput("\r")
      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Project:")
          expect(frame).toContain("Project Beta")
        },
      })

      await t.writeInput("\u0013")
      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Project Beta")
          expect(frame).toContain("#202 Beta")
          expect(frame).toContain("#203 Beta")
          expect(frame).toContain("#202")
        },
      })

      await t.writeInput("\u001B[B")
      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("#203")
          expect(frame).toContain("Beta second task")
        },
      })

      expect(getPlaneConfig(t.database).selectedProjectId).toBe("project-2")
    } finally {
      await t.destroy()
      if (previousWorkspaceOverride === undefined) {
        delete process.env.NIT_PLANE_WORKSPACE
      } else {
        process.env.NIT_PLANE_WORKSPACE = previousWorkspaceOverride
      }
    }
  })

  it("refreshes tasks after receiving a valid webhook", async () => {
    const previousWorkspaceOverride = process.env.NIT_PLANE_WORKSPACE
    delete process.env.NIT_PLANE_WORKSPACE
    const t = await createTestApp()

    try {
      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Configuration")
        },
      })

      const workspaceSlug = "my-team"
      const projectId = "project-1"
      const tasksPath = `https://plane.example.com/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/`
      let taskRequests = 0

      t.axiosMock
        .onGet(`https://plane.example.com/api/v1/workspaces/${workspaceSlug}/projects/`)
        .reply(200, {
          results: [
            {
              id: projectId,
              identifier: "ALPHA",
              name: "Project Alpha",
            },
          ],
        })
      t.axiosMock.onGet(tasksPath).reply(() => {
        taskRequests += 1
        if (taskRequests === 1) {
          return [
            200,
            {
              results: [
                {
                  id: "task-1",
                  sequence_id: 101,
                  name: "Alpha backlog task",
                  project: projectId,
                  priority: "medium",
                  state: "todo",
                },
              ],
            },
          ]
        }

        return [
          200,
          {
            results: [
              {
                id: "task-1",
                sequence_id: 101,
                name: "Alpha backlog task",
                project: projectId,
                priority: "medium",
                state: "todo",
              },
              {
                id: "task-2",
                sequence_id: 102,
                name: "Alpha webhook task",
                project: projectId,
                priority: "high",
                state: "todo",
              },
            ],
          },
        ]
      })

      await t.writeInput("\r")
      await t.writeInput("https://plane.example.com/my-team")
      await t.writeInput("\r")
      await t.writeInput("\t")
      await t.writeInput("\t")
      await t.writeInput("\r")
      await t.writeInput("plane-token-123")
      await t.writeInput("\r")
      await t.writeInput("\t")
      await t.writeInput("\r")
      await t.writeInput(defaultWebhookSecret)
      await t.writeInput("\r")
      await t.writeInput("\u0013")

      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Project Tasks")
          expect(frame).toContain("#101 Alpha")
        },
      })

      let webhookPort: number | null = null
      for (let attempt = 0; attempt < 20; attempt += 1) {
        webhookPort = getWebhookServerPort(t.database)
        if (webhookPort !== null) {
          break
        }

        await t.sleep(10)
      }

      if (webhookPort === null) {
        throw new Error("Webhook server port was not persisted.")
      }

      const payload = JSON.stringify({ event: "issue.created" })
      const svixHeaders = createSvixHeaders(defaultWebhookSecret, payload)
      const webhookResponse = await fetch(
        `http://127.0.0.1:${webhookPort}${planeWebhookPath}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...svixHeaders,
          },
          body: payload,
        },
      )
      expect(webhookResponse.status).toBe(200)

      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("#102 Alpha")
          expect(frame).not.toContain("Loading tasks...")
        },
      })
      expect(taskRequests).toBeGreaterThanOrEqual(2)

      await t.writeInput("l")
      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Webhook accepted.")
          expect(frame).toContain("Press l or Esc to close.")
        },
      })
    } finally {
      await t.destroy()
      if (previousWorkspaceOverride === undefined) {
        delete process.env.NIT_PLANE_WORKSPACE
      } else {
        process.env.NIT_PLANE_WORKSPACE = previousWorkspaceOverride
      }
    }
  })
})
