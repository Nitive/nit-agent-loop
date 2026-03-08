---
name: plane-agent-app-builder
description: Build and update Plane apps with a focus on Plane Agents that respond to @mentions in work items. Use when implementing Plane OAuth setup, bot-token installation flow, webhook signature verification, agent run webhook handlers, and AgentRun activity creation (thought/action/response/elicitation/error) with Plane SDKs.
---

# Plane Agent App Builder

Build Plane agent integrations that install through OAuth or use Workspace API Keys, receive webhook events, and respond using AgentRun activities.

## Follow This Workflow

### 1. Confirm Integration Type

- **Internal Integration**: Best for private workspace scripts/bots. Use **Workspace API Keys** (`x-api-key` header).
- **Marketplace App (Recommended for Agents)**: Best for distributable apps. Use **OAuth Bot Token** flow (App Installation ID).
- **User Token flow**: Use only when actions must run as a specific user.

### 2. Register the App/Integration in Plane

- For Apps: `Workspace Settings -> Integrations -> Build your own`.
- Configure `Setup URL`, `Redirect URI`, and `Webhook URL`.
- **CRITICAL**: Enable `Enable App Mentions` for agent behavior.
- Select minimal scopes (e.g., `agents.runs:write`, `agents.run_activities:write`).

### 3. Implement Install Flow (OAuth only)

- `GET /oauth/setup`: Redirect to `https://api.plane.so/auth/o/authorize-app/`.
- `GET /oauth/callback`: Exchange `app_installation_id` for a bot token via `POST /auth/o/token/` with `grant_type=client_credentials`.
- Fetch metadata: `GET /auth/o/app-installation/?id=...`.
- Persist `workspace_slug`, `app_installation_id`, and `bot_token`.

### 4. Secure Webhook Handling

- **Raw Body**: Read request as `arrayBuffer` or `buffer` _before_ JSON parsing.
- **Verification**: Compute HMAC-SHA256 of raw payload using your webhook secret.
- **Header**: Compare with `X-Plane-Signature`. Reject mismatch with 403.
- **Speed**: Return HTTP 200 immediately; process business logic in the background.

### 5. Handle Agent Webhook Events

- `agent_run_create`: Session initialization.
- `agent_run_user_prompt`: Process prompt/follow-up.
- **Idempotency**: Check `agent_run.id` to avoid re-processing retried webhooks.
- **Signals**: Always check for `stop` signal before starting heavy work.

### 6. AgentRun Activity Sequence

1. **`thought`**: Send within <2 seconds to acknowledge (prevents "stale" status).
2. **`action`**: Send for tool execution/background steps.
3. **`response`**: Send for final user-visible output.
4. **`elicitation`**: Use when user input is required (paired with `select` or `auth_request` signals).
5. **`error`**: Use for failures. Keep messages user-friendly and non-technical.

## Use SDK Defaults

Prefer the official SDK for type safety and automatic retries.

```sh
pnpm add @makeplane/plane-node-sdk
```

```ts
import { PlaneClient } from "@makeplane/plane-node-sdk"

const planeClient = new PlaneClient({
  baseUrl: process.env.PLANE_API_URL || "https://api.plane.so",
  // For Apps:
  accessToken: botToken,
  // For Internal Integrations:
  // apiKey: workspaceApiKey
})

await planeClient.agentRuns.activities.create(workspaceSlug, agentRunId, {
  type: "thought",
  content: { type: "thought", body: "Searching project issues..." },
})
```

## Validate Before Shipping

- Webhook signature verified against **raw** payload?
- First `thought` activity sent immediately?
- `stop` signal handled early?
- Correct `signal_metadata` structure used for `select`?
- Webhook handler idempotent?

## References

- `references/plane-agent-reference.md` — Payload structures, signals, and endpoint cheatsheet.
