import { afterEach } from "vitest"
import { cleanupAfterEach } from "./cleanup.js"

afterEach(async () => {
  await cleanupAfterEach.cleanup()
})
