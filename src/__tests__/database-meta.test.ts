import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { getMetaValue, openDatabase, setMetaValue } from "../db/database.js"

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe("database metadata", () => {
  it("stores and reads values from an isolated sqlite file", () => {
    const tempDir = fs.mkdtempSync(
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
