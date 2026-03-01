import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { getMetaValue, openDatabase, setMetaValue } from "../db/database.js"

const tempDirs: string[] = []

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

describe("database metadata", () => {
  it("stores and reads values from an isolated sqlite file", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "nit-agent-loop-test-"),
    )
    tempDirs.push(tempDir)

    const databasePath = path.join(tempDir, "app.sqlite")
    const database = openDatabase(databasePath)

    setMetaValue(database, "test.key", "value-1")
    expect(getMetaValue(database, "test.key")).toBe("value-1")

    database.close()
  })
})
