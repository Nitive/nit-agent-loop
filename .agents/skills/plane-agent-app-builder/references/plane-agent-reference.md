# Plane Agent App Reference

Validated against Plane developer docs on 2026-03-07.

## Source Pages

- https://developers.plane.so/dev-tools/build-plane-app/overview
- https://developers.plane.so/dev-tools/build-plane-app/create-oauth-application
- https://developers.plane.so/dev-tools/build-plane-app/choose-token-flow
- https://developers.plane.so/dev-tools/build-plane-app/webhooks
- https://developers.plane.so/dev-tools/build-plane-app/oauth-scopes
- https://developers.plane.so/dev-tools/build-plane-app/sdks
- https://developers.plane.so/dev-tools/build-plane-app/examples
- https://developers.plane.so/dev-tools/agents/overview
- https://developers.plane.so/dev-tools/agents/building-an-agent
- https://developers.plane.so/dev-tools/agents/best-practices
- https://developers.plane.so/dev-tools/agents/signals-content-payload

## App And Agent Model

- Plane app types:
- Service apps
- Assistant apps
- Author apps
- Agent behavior requires enabling app mentions at OAuth app creation.
- Agents are interaction-driven via AgentRun and AgentRunActivity.
- Agent runs can become stale after 5 minutes of inactivity, so send quick status activity.

## OAuth Setup Checklist

1. Create app in workspace integrations.
2. Configure:

- `Setup URL`
- `Redirect URI`
- `Webhook URL`

3. Enable `Enable App Mentions`.
4. Grant required scopes.
5. Save `client_id` and `client_secret`.

## Token Flow Choice

- Bot Token flow:
- Best for agents, automation, webhooks, background processing.
- Uses installation-specific bot token.
- Works without end-user interactive auth each run.

- User Token flow:
- Best when actions must execute as the installing user.
- Requires user consent and user token storage.

## Authentication Headers

- **Marketplace App**: `Authorization: Bearer <bot_token>`
- **Internal Integration**: `x-api-key: <api_key>`

## OAuth Endpoints (Marketplace Apps)

- Authorize install: `GET https://api.plane.so/auth/o/authorize-app/`
- Exchange to bot token: `POST https://api.plane.so/auth/o/token/`
- Installation metadata: `GET https://api.plane.so/auth/o/app-installation/?id=<id>`

---

## Agent Activity Payload

When creating an activity via `POST /api/v1/workspaces/{slug}/agent-runs/{id}/activities/`:

```json
{
  "type": "thought",
  "content": {
    "type": "thought",
    "body": "Analyzing work items..."
  },
  "signal": "continue"
}
```

**Activity Types**: `thought`, `action`, `response`, `elicitation`, `error`.

---

## Webhook Security Contract

- Header used by docs/examples: `X-Plane-Signature`.
- Signature algorithm: HMAC-SHA256 of raw request body using webhook secret.
- Handle raw body before JSON parsing.
- Reject signature mismatch with 403.
- Return 200 quickly, then process asynchronously.

## Agent Webhook Events

- `agent_run_create`
- Triggered when a new run/session is created.

- `agent_run_user_prompt`
- Triggered on user prompts/follow-ups.
- Payload includes `type: "agent_run_activity"`.
- Includes `agent_run` and `agent_run_activity` objects.

Common payload fields used in examples:

- `agent_run.id`
- `agent_run.workspace.slug`
- `agent_run_activity.content.body`
- `agent_run_activity.signal`

## Agent Activity Types

Primary activity/content types described in docs:

- `prompt`
- `thought` (ephemeral)
- `action` (ephemeral)
- `response`
- `elicitation`
- `error` (ephemeral)

Suggested usage pattern:

- `thought` quickly after webhook receipt.
- `action` for tool progress/steps.
- `response` for final answer.
- `elicitation` for required user choice/input.
- `error` for failures.

## Signals & Metadata

### `continue`

No metadata required. Used for intermediate status (thought/action).

### `stop`

No metadata required. Finalizes the run (response).

### `select`

Requires `options` in `signal_metadata`. Use with `elicitation`.

```json
{
  "type": "elicitation",
  "content": {
    "type": "prompt",
    "body": "Which project should I use?"
  },
  "signal": "select",
  "signal_metadata": {
    "options": [
      { "label": "Mobile App", "value": "proj_1" },
      { "label": "Backend API", "value": "proj_2" }
    ]
  }
}
```

### `auth_request`

Requires `url` in `signal_metadata`. Use with `elicitation`.

```json
{
  "type": "elicitation",
  "content": {
    "type": "prompt",
    "body": "I need you to authorize with GitHub first."
  },
  "signal": "auth_request",
  "signal_metadata": {
    "url": "https://github.com/login/oauth/authorize?..."
  }
}
```

## Scope Reference (From OAuth Scopes Page)

Agent run scopes:

- `agents.runs:read`
- `agents.runs:write`
- `agents.run_activities:read`
- `agents.run_activities:write`

Work-item and project scopes (when needed):

- `project_issues:read`
- `project_issues:write`
- `issue_activities:read`
- `issue_comments:read`
- `issue_comments:write`
- `workspaces:read`
- `project_members:read`

## SDKs

- Node:
- Package: `@makeplane/plane-node-sdk`
- Client class: `PlaneClient`
- Agent activity helper used in docs:
- `planeClient.agentRuns.activities.create(workspaceSlug, agentRunId, payload)`

- Python:
- Package: `plane-sdk`
- Client class: `PlaneClient`
- Agent activity helper used in docs:
- `client.agent_runs.create_activity(workspace_slug, agent_run_id, payload)`

## Reliability Practices

- Send immediate thought activity to avoid perceived stalls.
- Make webhook handlers idempotent.
- Handle stop signals early.
- Keep user-facing errors concise and non-sensitive.
- Preserve important context from prior run activities for multi-turn answers.
