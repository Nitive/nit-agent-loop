export const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

type FrameReader = {
  lastFrame: () => string | undefined
  frames?: string[]
}

export type WaitForStableFrameOptions = {
  stableFrames?: number
  maxAttempts?: number
  test?: (frame: string) => void
}

export const waitForStableFrame = async (
  app: FrameReader,
  options: WaitForStableFrameOptions = {},
) => {
  const stableFrames = options.stableFrames ?? 3
  const maxAttempts = options.maxAttempts ?? 200

  let previousFrame = app.lastFrame() ?? ""
  let previousFrameCount = app.frames?.length ?? 0
  let unchangedCount = 0

  for (let index = 0; index < maxAttempts; index += 1) {
    await flush()

    const currentFrame = app.lastFrame() ?? ""
    const currentFrameCount = app.frames?.length ?? previousFrameCount
    const unchanged =
      currentFrame === previousFrame && currentFrameCount === previousFrameCount

    if (unchanged) {
      unchangedCount += 1
      if (unchangedCount >= stableFrames) {
        if (options.test) {
          options.test(currentFrame)
        }

        return currentFrame
      }
      continue
    }

    previousFrame = currentFrame
    previousFrameCount = currentFrameCount
    unchangedCount = 0
  }

  throw new Error("Timed out waiting for a stable TUI frame")
}

export const writeInput = async (
  app: {
    stdin: { write: (value: string) => void }
    lastFrame: () => string | undefined
    frames?: string[]
  },
  value: string,
  stableFrames = 2,
) => {
  app.stdin.write(value)
  await waitForStableFrame(app, { stableFrames })
}
