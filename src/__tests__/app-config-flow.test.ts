import { describe, expect, it } from "vitest"
import { createTestApp } from "../test-helpers/app.js"

describe("app config flow", () => {
  it("restores config from db after recreating app with same database path", async () => {
    const previousWorkspaceOverride = process.env.NIT_PLANE_WORKSPACE
    delete process.env.NIT_PLANE_WORKSPACE
    const t1 = await createTestApp()

    try {
      await t1.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Configuration")
        },
      })

      await t1.writeInput("\r")
      await t1.writeInput("https://plane.example.com/")
      await t1.writeInput("\r")
      await t1.writeInput("\t")
      await t1.writeInput("\t")
      await t1.writeInput("\r")
      await t1.writeInput("plane-token-123")
      await t1.writeInput("\r")
      await t1.writeInput("\u0013")
      await t1.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("q:Quit c:Config")
          expect(frame).toContain("Project Tasks")
          expect(frame).toContain("Task Details")
        },
      })
      await t1.destroy({
        keepFiles: true,
      })

      const t2 = await createTestApp({ path: t1.tempDir })

      await t2.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("q:Quit c:Config")
          expect(frame).toContain("Project Tasks")
          expect(frame).toContain("Task Details")
        },
      })

      await t2.writeInput("c")
      await t2.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Workspace URL:")
          expect(frame).toContain("https://plane.example.com")
          expect(frame).toContain("Public Host:")
          expect(frame).toContain("localhost")
          expect(frame).toContain("Webhook Secret:")
          expect(frame).toContain("Configuration")
          expect(frame).toContain("Esc:Back")
        },
      })
    } finally {
      if (previousWorkspaceOverride === undefined) {
        delete process.env.NIT_PLANE_WORKSPACE
      } else {
        process.env.NIT_PLANE_WORKSPACE = previousWorkspaceOverride
      }
    }
  })

  it("uses NIT_PLANE_WORKSPACE to override workspace url at runtime", async () => {
    const previousOverride = process.env.NIT_PLANE_WORKSPACE
    process.env.NIT_PLANE_WORKSPACE = "http://host.docker.internal:10555/main"

    const t = await createTestApp()

    try {
      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("Configuration")
          expect(frame).toContain("http://host.docker.internal:10555/main")
          expect(frame).toContain("Webhook Secret:")
          expect(frame).toContain("Plane Webhooks Page:")
          expect(frame).toContain(
            "http://host.docker.internal:10555/main/settings/webhooks/",
          )
        },
      })

      t.axiosMock
        .onGet("http://host.docker.internal:10555/api/v1/workspaces/main/projects/")
        .reply(200, { results: [] })

      await t.writeInput("\t")
      await t.writeInput("\t")
      await t.writeInput("\r")
      await t.writeInput("plane-token-123")
      await t.writeInput("\r")
      await t.writeInput("\u0013")

      await t.waitForStableFrame({
        test(frame) {
          expect(frame).toContain("q:Quit c:Config")
          expect(frame).toContain("Project Tasks")
        },
      })

      expect(
        t.axiosMock.history.get.some(
          (request) =>
            request.url ===
            "http://host.docker.internal:10555/api/v1/workspaces/main/projects/",
        ),
      ).toBe(true)
    } finally {
      await t.destroy()
      if (previousOverride === undefined) {
        delete process.env.NIT_PLANE_WORKSPACE
      } else {
        process.env.NIT_PLANE_WORKSPACE = previousOverride
      }
    }
  })
})
