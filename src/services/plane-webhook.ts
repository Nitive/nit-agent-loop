import { planeWebhookPath } from "../server/plane-webhook-server.js"

export const buildPlaneWebhookUrl = (publicHost: string, port: number) => {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return null
  }

  const trimmedPublicHost = publicHost.trim()
  if (!trimmedPublicHost) {
    return null
  }

  try {
    const webhookBaseUrl = trimmedPublicHost.includes("://")
      ? trimmedPublicHost
      : `http://${trimmedPublicHost}`
    const webhookUrl = new URL(planeWebhookPath, webhookBaseUrl)
    if (webhookUrl.protocol !== "http:" && webhookUrl.protocol !== "https:") {
      return null
    }

    webhookUrl.port = String(port)
    webhookUrl.hash = ""
    webhookUrl.search = ""
    return webhookUrl.toString()
  } catch {
    return null
  }
}
