type Step = () => void | Promise<void>

export function createCleanupUtils() {
  let steps: Step[] = []

  return {
    addCleanupStep(step: Step) {
      steps.push(step)
    },
    async cleanup() {
      for await (const step of steps.slice().reverse()) {
        await step()
      }
      steps = []
    },
  }
}

export const cleanupAfterEach = createCleanupUtils()
