import { describe, expect, it } from "vitest"
import { getPlaneConfig } from "../db/database.js"
import { createTestApp } from "../test-helpers/app.js"

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const waitForFrameToContain = async (
  app: { lastFrame: () => string | undefined },
  text: string,
) => {
  for (let index = 0; index < 30; index += 1) {
    const frame = app.lastFrame() ?? ""
    if (frame.includes(text)) {
      return frame
    }

    await flush()
  }

  throw new Error(`Timed out waiting for frame containing: ${text}`)
}

describe("app config flow", () => {
  it("loads existing Plane config and reopens config screen from main view", async () => {
    const { app, database } = await createTestApp({
      planeConfig: {
        workspaceUrl: "https://plane.example.com",
        token: "plane-token-123",
      },
    })

    const savedConfig = getPlaneConfig(database)
    expect(savedConfig).toEqual({
      workspaceUrl: "https://plane.example.com",
      token: "plane-token-123",
    })

    expect(app.lastFrame()).toContain("hello")
    expect(app.lastFrame()).toContain("(world)")

    await sleep(60)
    app.stdin.write("c")
    const frame = await waitForFrameToContain(app, "Plane Configuration")

    expect(frame).toContain("Workspace URL:")
    expect(frame).toContain("https://plane.example.com")
    expect(frame).toContain("Esc:Back")
  })
})
