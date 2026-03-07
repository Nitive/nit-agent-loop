import { getPlaneConfig } from "../../db/database.js"
import type { AppContextValue } from "../../hooks/app-context.js"

export type PlaneProject = {
  id: string
  name: string
  identifier: string | null
}

type WorkspaceInfo = {
  origin: string
  slug: string
}

const getWorkspaceInfo = (workspaceUrl: string): WorkspaceInfo | null => {
  try {
    const url = new URL(workspaceUrl)
    const slug = url.pathname.split("/").filter(Boolean)[0]
    if (!slug) {
      return null
    }

    return {
      origin: url.origin,
      slug,
    }
  } catch {
    return null
  }
}

const parseProjects = (payload: unknown): PlaneProject[] => {
  const entries = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        "results" in payload &&
        Array.isArray((payload as { results: unknown }).results)
      ? (payload as { results: unknown[] }).results
      : []

  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return []
    }

    const { id, name, identifier } = entry as Record<string, unknown>
    if (typeof id !== "string" || typeof name !== "string") {
      return []
    }

    return [
      {
        id,
        name,
        identifier: typeof identifier === "string" ? identifier : null,
      },
    ]
  })
}

export class PlaneClient {
  private readonly ctx: AppContextValue

  constructor(ctx: AppContextValue) {
    this.ctx = ctx
  }

  async listProjects(): Promise<PlaneProject[]> {
    const planeConfig = getPlaneConfig(this.ctx.database)
    if (!planeConfig.workspaceUrl || !planeConfig.token) {
      return []
    }

    const workspaceInfo = getWorkspaceInfo(planeConfig.workspaceUrl)
    if (!workspaceInfo) {
      throw new Error(
        "Plane workspace URL must include workspace slug (for example: https://app.plane.so/my-team).",
      )
    }

    const url = `${workspaceInfo.origin}/api/v1/workspaces/${encodeURIComponent(workspaceInfo.slug)}/projects/`
    const response = await this.ctx.fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": planeConfig.token,
      },
    })

    if (!response.ok) {
      throw new Error(
        `Unable to load Plane projects (${response.status} ${response.statusText}).`,
      )
    }

    const payload = (await response.json()) as unknown
    return parseProjects(payload)
  }
}
