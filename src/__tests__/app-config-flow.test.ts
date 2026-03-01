import { describe, expect, it } from "vitest"
import { createTestApp } from "../test-helpers/app.js"

describe("app config flow", () => {
  it("restores config from db after recreating app with same database path", async () => {
    const t1 = await createTestApp()

    await t1.waitForStableFrame({
      test(frame) {
        expect(frame).toContain("Plane Configuration")
      },
    })

    await t1.writeInput("https://plane.example.com/")
    await t1.writeInput("\t")
    await t1.writeInput("plane-token-123")
    await t1.writeInput("\r")
    await t1.waitForStableFrame({
      test(frame) {
        expect(frame).toContain("q:Quit c:Config")
      },
    })
    await t1.destroy({
      keepFiles: true,
    })

    const t2 = await createTestApp({ path: t1.tempDir })

    await t2.waitForStableFrame({
      test(frame) {
        expect(frame).toContain("q:Quit c:Config")
        expect(frame).toContain("hello")
        expect(frame).toContain("(world)")
      },
    })

    await t2.writeInput("c")
    await t2.waitForStableFrame({
      test(frame) {
        expect(frame).toContain("Workspace URL:")
        expect(frame).toContain("https://plane.example.com")
        expect(frame).toContain("Plane Configuration")
        expect(frame).toContain("Esc:Back")
      },
    })
  })
})
