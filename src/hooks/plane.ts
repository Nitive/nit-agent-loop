import { PlaneClient } from "@makeplane/plane-node-sdk"
import { createContext, useContext } from "react"

export type PlaneContextValue = {
  client: PlaneClient
  workspaceSlug: string | null
}

export const PlaneContext = createContext<PlaneContextValue | null>(null)

export const usePlane = (): PlaneContextValue => {
  const context = useContext(PlaneContext)
  if (context === null) {
    throw new Error("usePlane must be used within <PlaneContext.Provider>")
  }

  return context
}
