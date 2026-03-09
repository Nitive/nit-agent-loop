import { describe, expect, it } from "vitest"
import { getPlaneConfig } from "../db/database.js"
import { createTestApp } from "../test-helpers/app.js"

describe("app projects list", () => {
  it("renders project tasks and selected task details", async () => {
    const t = await createTestApp()

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
    await t.writeInput("\r")
    await t.waitForStableFrame({
      test(frame) {
        expect(frame).toContain("Select Project")
        expect(frame).toContain("ALPHA: Project Alpha")
        expect(frame).toContain("Project Beta")
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
  })
})
