# Superset as a session driver: can Firehorse start and steer interactive Claude sessions through it?

**Researched:** 2026-09-27.

**Question:** Using only its CLI or its hosted MCP, can Superset (superset.sh) do six things?

1. Create a workspace (a worktree and a branch).
2. Launch an **interactive** Claude Code session in it with an initial prompt, such as `/firehorse:map 123`.
3. Send a follow-up message to a running session.
4. Report a session's status: running, waiting on the user, or ended.
5. Return the session's final output.
6. List the running sessions.

It also asks what auth each step needs, whether sessions run on the user's interactive Claude
subscription rather than on `claude -p` or the Agent SDK, and what signals show that Superset is
installed.

## Sources, and what was blocked

- **The source repo.** `github.com/superset-sh/superset` was cloned with `--depth 1` at HEAD
  `3fe2c36` (2026-09-26). It is a monorepo that holds the CLI (`packages/cli`, version 1.30.2,
  tag `cli-v1.30.2`), the MCP server (`packages/mcp`), the host service
  (`packages/host-service`), the shared agent presets (`packages/shared`), and the docs site
  source (`apps/docs/content/docs/**.mdx`). This is the source of truth for everything below.
  Paths are relative to the repo root.
- **Blocked hosts.** The egress proxy rejected the CONNECT to `superset.sh`, `docs.superset.sh`
  and `api.superset.sh` (`connect_rejected`). So the docs were read from their MDX source in the
  repo, not from the live site. The live MCP endpoint could not be called, so the tool list comes
  from source, not from `tools/list`.
- **npm.** The CLI is **not** published to npm: `npm view @superset-sh/cli` and
  `npm view @superset_sh/cli` both return 404, and the npm package named `superset` is an
  unrelated Set library. The CLI ships as a static binary from the desktop app, from
  `curl … superset.sh/cli/install.sh`, or through Homebrew (`apps/docs/content/docs/cli/getting-started.mdx`).
  Only the SDK is on npm: `@superset_sh/sdk` is at `0.0.1-alpha.12`.
- **Not tested.** Nothing was run against a live Superset install.

## Findings

### 1. Create a workspace: yes

| Surface | How |
|---|---|
| **CLI** | `superset workspaces create --local \| --host <id> --project <id> --name <n> --branch <b> [--base-branch <b>] [--pr <n>] [--task <id>] [--agent claude --prompt "…"] [--json]`. Mutating host commands need an explicit `--local` or `--host` (`packages/cli/src/commands/workspaces/create/command.ts`, `cli/getting-started.mdx` "Local vs. remote hosts") |
| **MCP** | `workspaces_create` with `hostId`, `projectId`, `name`, `branch`, `baseBranch`, `pr`, `checkout`, `taskId`, `agents[]` and `command`. With no `hostId`, it creates a *cloud* workspace instead (`packages/mcp/src/tools/workspaces/create.ts`) |

- **Where it lands.** The default checkout is an isolated worktree under
  `~/.superset/worktrees` (`packages/host-service/src/trpc/router/workspace-creation/shared/worktree-paths.ts:17`).
- **Launching in the same call.** `agents: [{agent:"claude", prompt}]` spawns the agent as soon
  as the workspace is created.
- **What it returns.** `{ workspace:{id,branch,…}, agents:[{ok, kind:"terminal", sessionId, label}] }`.

### 2. Launch an interactive Claude session with an initial prompt: yes

| Surface | How |
|---|---|
| **CLI** | `superset agents create --workspace <id> --local --agent claude --prompt "/firehorse:map 123" --json`, which returns `{kind, sessionId, label}` (`packages/cli/src/commands/agents/create/command.ts`) |
| **MCP** | `agents_create` with `workspaceId`, `agent`, `prompt`, `model`, `effort`, `resumeSessionId`, `attachmentIds` and `hostId` (`packages/mcp/src/tools/agents/create.ts`) |
| **In one call** | Pass `agents` to `workspaces_create` |

**How the session is launched:**

- **It is the normal TUI.** The built-in `claude` preset is
  `command: "claude --dangerously-skip-permissions"`
  (`packages/shared/src/builtin-terminal-agents.ts:61-70`). It sets no `promptCommand`, so the
  prompt command defaults to that same command, with the default `argv` transport
  (`packages/shared/src/agent-definition.ts:90-91`).
- **The prompt goes in as a positional argument.** It is written into a PTY as
  `claude --dangerously-skip-permissions "$(cat <<'SUPERSET_PROMPT_…' … )"`
  (`packages/shared/src/agent-prompt-launch.ts` `buildPromptCommandString`).
- **Permission prompts are off by default.** The preset adds `--dangerously-skip-permissions`.
  A user can edit the preset's command and args in Settings → Agents (the `HostAgentConfig`
  rows that `agents_list` returns).
- **Slash commands are untested.** Superset does nothing special with a prompt that starts
  with `/`. Whether `claude "/firehorse:map 123"` runs as a slash command depends on Claude
  Code's handling of the positional prompt, not on Superset.
- **Do not use `--agent superset`.** It opens a Superset *chat* session, which terminal
  read/send cannot control (`plugins/superset/skills/orchestrate/SKILL.md`).

### 3. Send a follow-up to a running session: yes

| Surface | How |
|---|---|
| **CLI** | `superset terminals send --workspace <id> --local --terminal <sessionId> --text "…" [--no-submit] --json` (`packages/cli/src/commands/terminals/send/command.ts`) |
| **MCP** | `terminals_send` with `workspaceId`, `terminalId`, `text` and `submit` (default true). The tool description says: "a follow-up prompt to a claude/codex agent … Multi-line text is delivered as a single paste" (`packages/mcp/src/tools/terminals/send.ts`) |

This writes keystrokes into the PTY. It has no acknowledgement that the agent accepted the
message.

### 4. Session status (running, waiting on the user, ended): partial, and not exposed on the CLI or the MCP

**What Superset tracks internally:**

- **It installs hooks into Claude.** Superset writes managed hooks into `~/.claude/settings.json`
  (and into each `CLAUDE_CONFIG_DIR` profile) for `SessionStart`, `SessionEnd`,
  `UserPromptSubmit`, `Stop`, `StopFailure`, `PostToolUse(Failure)`, `PermissionRequest` and
  the `Subagent*` events (`packages/agent-setup/src/agent-wrappers-claude-codex-opencode.ts:78-89`).
- **It maps those hooks to statuses.** `working` comes from Start, UserPromptSubmit or
  PostToolUse. `permission` comes from PermissionRequest. `review` comes from Stop, meaning the
  turn is over and the agent is waiting on the user. `failed` comes from StopFailure
  (`packages/shared/src/agent-status.ts`, `packages/host-service/src/events/map-event-type.ts`).
- **It keeps a record per terminal.** The host-service record carries `lastEventType`,
  `endedAt` and `endReason` (`packages/host-service/src/terminal-agents/types.ts:50-65`).
- **The docs describe this.** "Claude Code reports both finished and waiting states"
  (`apps/docs/content/docs/agent-status.mdx`).

**What a caller can reach:**

- **Only the desktop UI and the host's internal tRPC.** The state is surfaced through the UI and
  through the host service's internal tRPC (`terminalAgents.list` and `listByWorkspace` in
  `packages/host-service/src/trpc/router/terminal-agents/terminal-agents.ts:379-395`).
- **No public tool or command reads it.** The MCP registers no status tool
  (`packages/mcp/src/tools/register.ts`). `terminals_list` and `superset terminals list` return
  only `{terminalId, exited, exitCode, attached, title, createdAt}`
  (`packages/mcp/src/tools/terminals/list.ts`).
- **Superset's own skill says so.** "`terminals list` reports live sessions, not whether an
  agent is working or idle; do not infer completion from presence, absence, `attached`, or
  terminal title alone" (`plugins/superset/skills/orchestrate/SKILL.md`). Its workaround is a
  prompt convention: the worker prints a `SUPERSET_WORKER_DONE` or `SUPERSET_WORKER_BLOCKED`
  envelope, and the coordinator polls `terminals read` for it.
- **Ended is detectable, crudely.** A session has ended when `exited: true`, or when the
  terminal has vanished from the list.
- **Cloud workspaces differ.** They report the status to the API
  (`apps/api/src/app/api/cloud-workspaces/[workspaceId]/agent-status/route.ts`), but that is a
  sandbox-to-API ingest route, not a read tool.

### 5. Return the final output: partial

| Surface | How | Limits |
|---|---|---|
| **MCP** | `terminals_read` with `workspaceId`, `terminalId` and `maxLines` | "what is on screen now (plus recent scrollback), not a full transcript" (`packages/mcp/src/tools/terminals/read.ts`) |
| **CLI** | `superset terminals read --workspace <id> --terminal <id> [--max-lines N] --json` | Same screen snapshot |
| **CLI only** | `superset agents read --workspace <id> --terminal <id>` | Reads the agent's own transcript up to 400k characters, "beyond the screen `terminals read` returns" (`packages/cli/src/commands/agents/read/command.ts`, backed by `terminalAgents.transcript`). The source notes that a full-screen TUI "keeps no scrollback, so this is the only way to read what it said before the last frame". The MCP has no equivalent |

There is no structured "final message" field. A caller has to parse the transcript or the
screen.

### 6. List running sessions: partial

- **Per workspace only.** `terminals_list` (MCP) and `superset terminals list --workspace <id>`
  (CLI) list the live terminals in one workspace.
- **No org-wide or host-wide listing.** You enumerate `workspaces_list` or
  `superset workspaces list --host|--local`, then call `terminals list` for each workspace. The
  docs say: "There is no org-wide listing; the desktop app is the cross-host view"
  (`cli/getting-started.mdx`).
- **Terminals, not agents.** The result is not filtered to agent terminals, and it carries no
  working or idle state (see §4).

## Auth

- **CLI.** `superset auth login` runs a browser OAuth flow and stores the token in
  `~/.superset/config.json`. `superset auth login --api-key sk_live_…` stores a key instead.
  The `SUPERSET_API_KEY` environment variable, or `--api-key`, overrides both for one
  invocation (`packages/cli/src/lib/resolve-auth.ts:27-37`, `cli/getting-started.mdx`). Keys
  come from the desktop app's Settings → API Keys.
- **Which calls touch the network.** Local calls (`--local`) go straight to the host server over
  loopback. Remote calls go through `api.superset.sh` and the relay, and the target host must be
  online (`packages/cli/src/lib/env.ts`).
- **MCP endpoint.** The canonical URL is now **`https://api.superset.sh/mcp`**. The
  `/api/v2/agent/mcp` URL that D-18 configures is kept as a "legacy alias", and v1
  `/api/agent/mcp` returns 410 (`apps/docs/content/docs/mcp-server.mdx`,
  `apps/api/src/app/openapi.json/route.ts:119-136`).
- **MCP auth.** The server takes `Authorization: Bearer <OAuth token | sk_… API key>` or
  `x-api-key` (`packages/mcp/src/auth.ts` `extractBearer` and `isApiKey`). The documented Claude
  Code setup is `claude mcp add superset --transport http https://api.superset.sh/mcp`, which
  uses OAuth.
- **Rate limit.** 600 requests per 60 seconds per credential.
- **Consequence for Firehorse.** Driving *local* sessions through the hosted MCP routes from the
  cloud through the relay back to the user's own host service. The CLI with `--local` avoids
  that round trip.

## Subscription vs `claude -p`

**Agent sessions run on the interactive subscription.**

- **They are the ordinary TUI.** An agent session is the interactive `claude` TUI running in a
  PTY. Superset's `~/.superset/bin/claude` wrapper only forwards `SUPERSET_*` env vars and then
  `exec "$REAL_BIN" "$@"` (`agent-wrappers-claude-codex-opencode.ts:291-303`).
- **They use the user's own login.** Sessions run on the user's normal Claude Code login, and
  Superset supports several such logins as `CLAUDE_CONFIG_DIR` profiles.
- **The docs confirm it.** The Usage page reads "official subscription quota for every Claude
  Code … login on this host" and says "Subscription usage isn't billed per token"
  (`apps/docs/content/docs/usage.mdx`).
- **API keys are for the chat UI only.** The providers doc says terminal agents "just work", and
  only the built-in *chat* UI takes API keys (`providers.mdx`).

**The one exception is workspace naming.**

- **It shells out to `claude -p`.** When Superset AI-names a workspace or branch from the
  prompt, it runs the preset's `nonInteractiveCommand`, `claude --strict-mcp-config -p`, with
  model `haiku` (`builtin-terminal-agents.ts:69`,
  `host-service/.../workspace-creation/utils/ai-workspace-names.ts:180-230, 411-455`).
- **That is a headless call.** Under the post-2026-06-15 terms it likely draws on the separate
  Agent SDK or `-p` credit. It is small, but it is not zero.
- **How to avoid it.** The rename applies only when the user did not type a name or branch
  (`renameTitle` and `renameBranch`), so passing an explicit `--name` and `--branch` should
  skip it. That was inferred from the code and not verified at runtime. The host MCP path
  already requires `name`.

## Signals that Superset is installed

These are confirmed from source. Compare `packages/firehorse-claude/skills/firehorse-setup/SKILL.md`,
which already checks most of them.

- **The home directory.**
  - `~/.superset/` exists, or `$SUPERSET_HOME_DIR` is set.
  - `~/.superset/config.json` holds the CLI auth and the active organization.
  - `~/.superset/host/<orgId>/manifest.json` and `host.db` belong to the host service
    (`cli/getting-started.mdx` "Where state lives", `packages/cli/src/lib/config.ts:27-29`).
- **The CLI.** `~/.superset/bin/superset` is the app-managed CLI shim, and `~/.superset/bin` also
  holds the agent wrappers. Alternatively, `superset` is on `PATH` from a standalone install
  under `~/superset/bin` or from Homebrew.
- **Auth works.** `superset auth whoami --json` succeeds, which also proves the session is
  valid.
- **Worktrees.** Workspace paths contain `/.superset/worktrees/`.
- **Inside a Superset terminal.**
  - `SUPERSET_WORKSPACE_ID`, `SUPERSET_TERMINAL_ID`, `SUPERSET_WORKSPACE_NAME` and
    `SUPERSET_ROOT_PATH` are set (`terminal-integration.mdx`, host-service terminal env tests).
  - The CLI treats `SUPERSET_AGENT` as an agent environment.
- **Hooks.** `~/.claude/settings.json` contains Superset-managed notify-hook commands.
- **macOS app.** `/Applications/Superset.app` exists. There is also an experimental Linux
  AppImage.
- **An API key.** `SUPERSET_API_KEY` is set, and it starts with `sk_`.
- **A live host.** Superset is running, not just installed, when the host server is up: the
  desktop app is running or `superset start` was run, and `superset hosts list` shows this
  machine online.

## Implications for Firehorse

- **Superset covers starting and steering.** It can create the worktree, start an interactive,
  subscription-billed `claude` with `/firehorse:map 123`, send follow-ups, and read the
  transcript.
- **It is weak on observing.** No public surface gives running, waiting or ended status, and
  there is no cross-workspace session list.
- **Firehorse needs its own completion signal.** For a deterministic driver, that means either
  a Firehorse `Stop` or `SessionEnd` hook writing state to a file, or Superset's
  envelope-in-output convention. Relying on the internal host-service tRPC
  (`terminalAgents.listByWorkspace`) would work technically, but it is undocumented and could
  change without notice.
- **Prefer the CLI with `--local`.** It is simpler than the MCP for local driving, and only the
  CLI has `agents read`.
- **Update the endpoint in D-18.** The configured URL should move to `https://api.superset.sh/mcp`
  when convenient. The alias still works.

## Summary table

| Capability | Answer | CLI command / MCP tool | Source |
|---|---|---|---|
| Create a workspace (worktree and branch) | **Yes** | `superset workspaces create --local --project <id> --name <n> --branch <b>` / `workspaces_create` | `packages/cli/src/commands/workspaces/create/command.ts`; `packages/mcp/src/tools/workspaces/create.ts` |
| Launch interactive Claude with an initial prompt | **Yes** (TUI, `--dangerously-skip-permissions` by default; a `/slash` prompt is untested) | `superset agents create --workspace <id> --local --agent claude --prompt "…"` / `agents_create`, or `workspaces_create.agents[]` | `packages/mcp/src/tools/agents/create.ts`; `packages/shared/src/builtin-terminal-agents.ts:61-70`; `packages/shared/src/agent-prompt-launch.ts` |
| Send a follow-up to a running session | **Yes** (PTY keystrokes, no acknowledgement) | `superset terminals send --terminal <sessionId> --text "…"` / `terminals_send` | `packages/mcp/src/tools/terminals/send.ts` |
| Report status (running / waiting / ended) | **Partial**: tracked internally from hooks, not exposed; only `exited` is public | `terminals list` / `terminals_list` (`exited`, `exitCode`); the internal tRPC `terminalAgents.listByWorkspace` is undocumented | `agent-status.mdx`; `packages/shared/src/agent-status.ts`; `packages/mcp/src/tools/register.ts`; `plugins/superset/skills/orchestrate/SKILL.md` |
| Return the final output | **Partial**: a screen snapshot on both surfaces; the full transcript on the CLI only | `superset agents read --terminal <id>` (CLI only); `terminals read` / `terminals_read` | `packages/cli/src/commands/agents/read/command.ts`; `packages/mcp/src/tools/terminals/read.ts` |
| List running sessions | **Partial**: per workspace, terminals rather than agents, no status | `superset terminals list --workspace <id>` / `terminals_list` (after `workspaces list` / `workspaces_list`) | `packages/mcp/src/tools/terminals/list.ts`; `cli/getting-started.mdx` |
| Auth | CLI: OAuth `auth login`, or `SUPERSET_API_KEY` (`sk_live_…`). MCP: OAuth or a Bearer `sk_` key at `https://api.superset.sh/mcp` (the v2 path is an alias) | — | `packages/cli/src/lib/resolve-auth.ts`; `packages/mcp/src/auth.ts`; `mcp-server.mdx` |
| Runs on the interactive subscription | **Yes** for sessions. **Exception:** AI workspace naming runs `claude -p --model haiku` | — | `agent-wrappers-claude-codex-opencode.ts`; `usage.mdx`; `ai-workspace-names.ts` |
| Install signals | `~/.superset/{config.json,bin/superset,host/,worktrees/}`, `superset auth whoami`, `SUPERSET_*` env vars, Superset hooks in `~/.claude/settings.json` | — | `cli/getting-started.mdx`; `terminal-integration.mdx`; `packages/cli/src/lib/config.ts` |
