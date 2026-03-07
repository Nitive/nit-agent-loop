import { describe, expect, it } from "vitest"
import { createTestApp } from "../test-helpers/app.js"

describe("app projects list", () => {
  it("renders projects from mocked Plane API response", async () => {
    const t = await createTestApp()

    await t.waitForStableFrame({
      test(frame) {
        expect(frame).toContain("Plane Configuration")
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

    await t.writeInput("https://plane.example.com/my-team")
    await t.writeInput("\t")
    await t.writeInput("plane-token-123")
    await t.writeInput("\r")

    await t.waitForStableFrame({
      test(frame) {
        expect(frame).toContain("Plane Projects")
        expect(frame).toContain("ALPHA: Project Alpha")
        expect(frame).toContain("Project Beta")
      },
    })
  })
})
