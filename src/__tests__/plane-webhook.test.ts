import { describe, expect, it } from "vitest"
import { buildPlaneWebhookUrl } from "../services/plane-webhook.js"

describe("plane webhook", () => {
  it("builds webhook url using public host and server port", () => {
    expect(buildPlaneWebhookUrl("localhost", 40123)).toBe(
      "http://localhost:40123/plane/webhook",
    )
    expect(buildPlaneWebhookUrl("https://public.example.com", 40123)).toBe(
      "https://public.example.com:40123/plane/webhook",
    )
    expect(buildPlaneWebhookUrl("", 40123)).toBeNull()
    expect(buildPlaneWebhookUrl("localhost", 0)).toBeNull()
  })
})
