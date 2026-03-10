import http from "node:http"
import type { DatabaseSync } from "node:sqlite"
import { Webhook } from "svix"
import {
  getPlaneConfig,
  getWebhookServerPort,
  saveWebhookServerPort,
} from "../db/database.js"

export const planeWebhookPath = "/plane/webhook"

export type PlaneWebhookServer = {
  close: () => Promise<void>
  port: number
  portChanged: boolean
}

export type PlaneWebhookEvent =
  | {
      type: "accepted"
    }
  | {
      type: "rejected"
      reason: "missing_secret" | "invalid_signature"
    }
  | {
      type: "invalid_request"
    }

type StartPlaneWebhookServerOptions = {
  onWebhookEvent?: (event: PlaneWebhookEvent) => void
}

const isAddressInUseError = (
  error: unknown,
): error is NodeJS.ErrnoException => {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code === "EADDRINUSE"
  )
}

const readRequestBody = async (request: http.IncomingMessage) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []

    request.on("error", reject)
    request.on("data", (chunk: Buffer | string) => {
      if (typeof chunk === "string") {
        chunks.push(Buffer.from(chunk))
        return
      }

      chunks.push(chunk)
    })
    request.on("end", () => {
      resolve(Buffer.concat(chunks))
    })
  })

const listenOnPort = async (server: http.Server, port: number) =>
  new Promise<number>((resolve, reject) => {
    const handleError = (error: Error) => {
      server.removeListener("listening", handleListening)
      reject(error)
    }

    const handleListening = () => {
      server.removeListener("error", handleError)
      const address = server.address()
      if (!address || typeof address === "string") {
        reject(new Error("Unable to resolve webhook server port."))
        return
      }

      resolve(address.port)
    }

    server.once("error", handleError)
    server.once("listening", handleListening)
    server.listen(port, "0.0.0.0")
  })

const closeServer = async (server: http.Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })

const emitWebhookEvent = (
  options: StartPlaneWebhookServerOptions,
  event: PlaneWebhookEvent,
) => {
  if (!options.onWebhookEvent) {
    return
  }

  queueMicrotask(() => {
    try {
      options.onWebhookEvent?.(event)
    } catch (error) {
      console.error("Webhook event handler failed.", error)
    }
  })
}

const toHeaderRecord = (headers: http.IncomingHttpHeaders) => {
  const record: Record<string, string> = {}

  for (const [key, rawValue] of Object.entries(headers)) {
    if (rawValue === undefined) {
      continue
    }

    if (Array.isArray(rawValue)) {
      if (rawValue.length === 0) {
        continue
      }

      record[key] = rawValue.join(", ")
      continue
    }

    record[key] = rawValue
  }

  return record
}

const isValidSignature = ({
  payload,
  secret,
  headers,
}: {
  payload: Buffer
  secret: string
  headers: Record<string, string>
}) => {
  try {
    const webhook = new Webhook(secret)
    webhook.verify(payload, headers)
    return true
  } catch {
    return false
  }
}

const createPlaneWebhookServer = (
  database: DatabaseSync,
  options: StartPlaneWebhookServerOptions,
) =>
  http.createServer((request, response) => {
    const requestPath = request.url
      ? new URL(request.url, "http://127.0.0.1").pathname
      : "/"

    if (request.method === "GET" && requestPath === "/healthz") {
      response.statusCode = 200
      response.setHeader("content-type", "application/json")
      response.end('{"status":"ok"}')
      return
    }

    if (request.method === "POST" && requestPath === planeWebhookPath) {
      void readRequestBody(request)
        .then((payload) => {
          const webhookSecret =
            getPlaneConfig(database).webhookSecret?.trim() ?? ""
          if (!webhookSecret) {
            response.statusCode = 503
            response.setHeader("content-type", "application/json")
            response.end('{"error":"webhook_secret_not_configured"}')
            emitWebhookEvent(options, {
              type: "rejected",
              reason: "missing_secret",
            })
            return
          }

          if (!isValidSignature({
            payload,
            secret: webhookSecret,
            headers: toHeaderRecord(request.headers),
          })) {
            response.statusCode = 403
            response.setHeader("content-type", "application/json")
            response.end('{"error":"invalid_signature"}')
            emitWebhookEvent(options, {
              type: "rejected",
              reason: "invalid_signature",
            })
            return
          }

          response.statusCode = 200
          response.setHeader("content-type", "application/json")
          response.end('{"ok":true}')
          emitWebhookEvent(options, { type: "accepted" })
        })
        .catch(() => {
          response.statusCode = 400
          response.setHeader("content-type", "application/json")
          response.end('{"error":"invalid_request"}')
          emitWebhookEvent(options, { type: "invalid_request" })
        })
      return
    }

    response.statusCode = 404
    response.setHeader("content-type", "application/json")
    response.end('{"error":"not_found"}')
  })

export const startPlaneWebhookServer = async (
  database: DatabaseSync,
  options: StartPlaneWebhookServerOptions = {},
): Promise<PlaneWebhookServer> => {
  const server = createPlaneWebhookServer(database, options)
  const savedPort = getWebhookServerPort(database)
  let resolvedPort: number

  if (savedPort !== null) {
    try {
      resolvedPort = await listenOnPort(server, savedPort)
    } catch (error) {
      if (!isAddressInUseError(error)) {
        throw error
      }

      resolvedPort = await listenOnPort(server, 0)
    }
  } else {
    resolvedPort = await listenOnPort(server, 0)
  }

  const portChanged = savedPort !== resolvedPort
  if (portChanged) {
    saveWebhookServerPort(database, resolvedPort)
  }

  return {
    close: () => closeServer(server),
    port: resolvedPort,
    portChanged,
  }
}
