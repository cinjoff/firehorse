---
name: firehorse-setup
description: Run once after installing Firehorse. Checks Firehorse setup, detects Superset, and configures the user-global Superset MCP server safely. Use --check for read-only status.
---

# firehorse-setup

Run this once after installing `firehorse-pi`.

Pi command: `/skill:firehorse-setup`

## Goals

- Verify the Firehorse Pi package is installed and exposing its bundled tools.
- Detect whether the user is using Superset.
- Pin the claude-mem / pi-agent-memory project id to the canonical repository
  name so memory persists across Superset and git worktrees.
- Verify that Firehorse-pi's bundled `claude-mem` worker scripts are installed
  and reachable; `pi-agent-memory` is the Pi adapter and depends on that
  worker.
- Sync generated Firehorse Pi subagent role mirrors from the installed package
  into the user-global Pi agent directory because `pi-subagents` does not
  discover package agent directories.
- If Superset is detected, configure Superset MCP in the **user-global** Pi MCP
  config so it works in new Superset workspaces.
- Keep Superset API keys out of project files, git worktrees, and chat history.

## Arguments

Interpret the user's arguments naturally:

- `--check` / "check setup" / "verify" — read-only status report. Do not write.
- `--superset` / `--force-superset` — configure Superset MCP even if detection
  is inconclusive.
- `--no-superset` — skip Superset MCP setup.
- `--claude` — also offer Claude Code user-scoped MCP setup if Claude Code is installed.
- `--memory-project <name>` / "pin memory to <name>" — optional manual override
  when no GitHub repository can be resolved.

## Setup status mode (`--check`)

Run detection only and present one concise table.

Check:

1. Firehorse package presence:
   - `~/.pi/agent/settings.json` contains `firehorse-pi`, `cinjoff/firehorse`,
     or a local path ending in `packages/firehorse-pi`.
2. Superset usage signals:
   - current path contains `/.superset/worktrees/`
   - `~/.superset/` exists
   - `/Applications/Superset.app` exists on macOS
   - `superset` CLI exists on `PATH`
   - `SUPERSET_API_KEY` is set
   - `~/.config/firehorse/superset.env` exists
3. Superset secret safety:
   - `~/.config/firehorse/superset.env` is missing, or has mode `600` on
     Unix-like systems.
4. MCP config:
   - `$PI_CODING_AGENT_DIR/mcp.json` if `PI_CODING_AGENT_DIR` is set, otherwise
     `~/.pi/agent/mcp.json`.
   - `mcpServers.superset.url` is
     `https://api.superset.sh/api/v2/agent/mcp`.
   - `mcpServers.superset.auth` is `"bearer"`.
   - `mcpServers.superset.bearerTokenEnv` is `"SUPERSET_API_KEY"`.
5. Bundled MCP adapter and env loader:
   - Firehorse exposes the `mcp` proxy tool, or `pi-mcp-adapter` appears in the
     installed Firehorse package manifest.
   - Firehorse's `firehorse-superset-env` extension is present so the optional
     private env file can be loaded for Pi sessions launched outside a shell.
6. Memory project pinning:
   - Resolve the canonical project id from GitHub repository metadata by
     running `gh repo view --json name --jq .name` from the current checkout.
   - Prefer existing explicit env / private env-file values only when they are
     already set; `--memory-project` is a manual fallback, not the normal path.
   - The Superset path segment `/.superset/worktrees/<project>/` may be used as
     a diagnostic suggestion only.
   - Do **not** infer from git worktree parent directories or cwd basename for
     Conductor/Superset workspaces; those paths may not mirror the canonical
     repo name.
   - Firehorse's `firehorse-memory-project` extension is present.
   - `PI_MEM_PROJECT` and `CLAUDE_MEM_PROJECT` are explicitly set to the
     canonical project id, or `~/.config/firehorse/memory.env` exists and is
     private.
7. claude-mem worker runtime:
   - `pi-agent-memory` requires the upstream `claude-mem` worker reachable on
     `CLAUDE_MEM_HOST` / `CLAUDE_MEM_PORT` (defaults `127.0.0.1:37777`).
   - Check `npx claude-mem --version`, `~/.claude-mem/`, and a non-destructive
     worker health request such as `GET http://127.0.0.1:37777/health` when the
     default port is in use.
   - If the bundled worker scripts are missing, show `pi update npm:firehorse-pi`
     or reinstall instructions; if an external fallback is needed, show `npx
claude-mem install` or the Claude Code plugin marketplace commands. Do not
     claim that `npm install -g claude-mem` is sufficient because upstream
     documents it as SDK/library-only.
8. Generated Firehorse Pi agent-role sync:
   - Locate generated package sync artifacts under the installed Firehorse Pi
     package's `agents/*.md` directory.
   - Check user-global targets under `$PI_CODING_AGENT_DIR/agents/` if
     `PI_CODING_AGENT_DIR` is set, otherwise `~/.pi/agent/agents/`.
   - A target is current only when it exists, has Firehorse provenance, and its
     `firehorseSourceSha256` matches the source artifact. Missing or stale
     targets should be reported as needing full setup.
   - If a target exists without Firehorse provenance, report a conflict and do
     not overwrite it.

Status table shape:

```markdown
| Component               | Status                                     |
| ----------------------- | ------------------------------------------ |
| Firehorse package       | ✓ installed / ✗ missing                    |
| Superset detected       | ✓ yes / ○ no / ? inconclusive              |
| Superset API key        | ✓ env set / ✓ env file / ✗ missing         |
| Secret file permissions | ✓ private / ✗ too open / ○ not present     |
| Pi MCP config           | ✓ configured / ✗ missing / ⚠ needs update  |
| pi-mcp-adapter          | ✓ available / ✗ missing                    |
| Superset env loader     | ✓ available / ✗ missing                    |
| Memory project id       | ✓ <project> / ⚠ gh unavailable / ✗ missing |
| Memory env loader       | ✓ available / ✗ missing                    |
| claude-mem worker       | ✓ reachable / ✗ not running / ⚠ install    |
| Firehorse agent roles   | ✓ synced / ⚠ stale / ✗ conflict            |
```

If anything needs action, show the exact next command or file path. Then stop.

## Full setup

### 1. Banner

Print:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FIREHORSE ► SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Detect Superset

Use the signals from setup status mode.

Superset is considered detected if any strong signal is true:

- current path contains `/.superset/worktrees/`
- `~/.superset/` exists
- `/Applications/Superset.app` exists on macOS
- `SUPERSET_API_KEY` is set
- `~/.config/firehorse/superset.env` exists

If Superset is not detected and the user did not pass `--superset`, do **not**
write MCP config. Show:

```text
○ Superset not detected. Skipping Superset MCP.

If you use Superset, run:
  /skill:firehorse-setup --superset
```

Continue with any other setup checks added to this skill in the future.

### 3. Configure memory project identity

Firehorse bundles both `pi-agent-memory` and the `claude-mem` npm package for
Pi-only harness use. `pi-agent-memory` uses `PI_MEM_PROJECT`; the bundled
claude-mem worker and Claude-side plugin use `CLAUDE_MEM_PROJECT`. Both must
point at the canonical repository name, not the current Superset/generated
worktree basename.

Resolve and pin the canonical project id automatically in this order:

1. Explicit `--memory-project <name>` only if the user provided it as an
   override.
2. Existing `FIREHORSE_PROJECT_NAME`, `PI_MEM_PROJECT`, or `CLAUDE_MEM_PROJECT`
   from the environment.
3. Existing private `~/.config/firehorse/memory.env` value.
4. GitHub repository name from the current checkout using the GitHub CLI:

```sh
gh repo view --json name --jq .name
```

Run this command during setup; do not ask the user for the repo name if it
succeeds.

Do not derive the canonical id from git worktree parent directories, git root
basenames, or cwd basenames for Conductor/Superset workspaces. Some orchestrators
store worktrees outside the canonical repo root, so parent paths can be wrong.
The Superset path segment `/.superset/worktrees/<project>/...` is only a useful
hint for humans. If `gh` is unavailable or cannot resolve the repository, ask the
user to authenticate/install `gh` or run setup with `--memory-project <repo>`
rather than guessing.

For Superset workspaces like:

```text
~/.superset/worktrees/firehorse/<owner>/<workspace>
```

`gh repo view --json name --jq .name` should return:

```text
firehorse
```

Pi runtime behavior:

- Firehorse's `firehorse-memory-project` extension loads an explicit private
  `~/.config/firehorse/memory.env`, then sets missing `FIREHORSE_PROJECT_NAME`,
  `PI_MEM_PROJECT`, and `CLAUDE_MEM_PROJECT` before `pi-agent-memory` handles
  `session_start`.
- For Superset / Conductor / headless launchers, pass these env vars explicitly
  when spawning agents so subagents inherit the same project id.
- Create or update `~/.config/firehorse/memory.env` with mode `600`:

```sh
project_name="$(gh repo view --json name --jq .name)"
mkdir -p ~/.config/firehorse
chmod 700 ~/.config/firehorse
printf 'FIREHORSE_PROJECT_NAME=%s\nPI_MEM_PROJECT=%s\nCLAUDE_MEM_PROJECT=%s\n' \
  "$project_name" "$project_name" "$project_name" > ~/.config/firehorse/memory.env
chmod 600 ~/.config/firehorse/memory.env
```

Do not store secrets in this file; it is only for non-secret memory project
identity. If it is group/world-readable on Unix-like systems, tell the user to
run `chmod 600 ~/.config/firehorse/memory.env`.

### 4. Verify claude-mem worker runtime

`pi-agent-memory` is the Pi adapter for memory capture/search. It requires the
upstream `claude-mem` worker; Firehorse-pi bundles the `claude-mem` npm package
and ships `firehorse-claude-mem-worker`, a session-start extension that checks
and starts the bundled worker for Pi-only harness use. The worker provides the
SQLite/FTS5/Chroma database, context injection API, and search endpoints on port
`37777` by default.

The upstream installation docs still matter as the fallback / repair path. They
support two normal install paths:

```sh
npx claude-mem install
```

or, inside Claude Code:

```text
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

Both configure hooks and start the worker service. Do **not** tell users that
`npm install -g claude-mem` is sufficient; upstream documents that as the
SDK/library only, without plugin hooks or worker startup.

During setup/check mode, verify non-destructively:

- Firehorse-pi's installed package has `node_modules/claude-mem/plugin/scripts/worker-service.cjs`
  and `node_modules/claude-mem/plugin/scripts/bun-runner.js`, or `npx
claude-mem --version` succeeds as an external fallback.
- `~/.claude-mem/` exists after the worker has initialized.
- The worker responds on `http://${CLAUDE_MEM_HOST:-127.0.0.1}:${CLAUDE_MEM_PORT:-37777}/health`
  when reachable.

If the bundled worker scripts are missing, tell the user to update/reinstall
`firehorse-pi`; this is a packaging problem, not a Claude Code prerequisite. If
the scripts exist but the worker is stopped, restart/reload Pi so
`firehorse-claude-mem-worker` can start it, or ask approval before running
`npx claude-mem start` / `npx claude-mem repair` as a fallback. Then optionally
run `/memory-status` to verify the `pi-agent-memory` connection.

### 5. Sync generated Firehorse Pi agent roles

`pi-subagents` discovers builtin, user, and project agent directories, but it
does not discover agent directories inside installed Pi packages. Firehorse
therefore ships generated Pi-compatible agent-role mirrors as package sync
artifacts and `firehorse-setup` copies them into the user-global Pi agent
directory.

Source artifacts live under the installed Firehorse Pi package's `agents/*.md`
directory. Target directory:

- If `PI_CODING_AGENT_DIR` is set: `$PI_CODING_AGENT_DIR/agents/`
- Otherwise: `~/.pi/agent/agents/`

Rules:

- Create the target directory when missing.
- Copy missing generated agent-role files.
- Overwrite a target only when it already has valid Firehorse provenance.
- Treat a target as stale when its `firehorseSourceSha256` differs from the
  package source artifact.
- If a target exists without Firehorse provenance, stop and ask the user how to
  resolve the conflict; do not overwrite a hand-authored agent.
- Preserve package source filenames exactly. Generic agent-role mirrors use
  provider-native names without a `horse-` prefix.

Sync every generated `agents/*.md` package artifact rather than assuming a fixed
filename. Current generated examples include `agents/reviewer.md`,
`agents/plan-reviewer.md`, and `agents/worker.md`; retired generated artifacts
such as `agents/firehorse/reviewer.md`, `agents/firehorse/plan-reviewer.md`,
`horse-code-reviewer.md`, `horse-plan-reviewer.md`, and
`horse-diagnostic-reviewer.md` should be removed from user-global targets only
when they have valid Firehorse provenance.

### 6. Configure Superset MCP for Pi

Superset MCP v2 is a hosted HTTP MCP server. There is no npm MCP server binary
to install. Firehorse bundles `pi-mcp-adapter`; setup only needs to write the
user-global MCP entry.

Target file:

- If `PI_CODING_AGENT_DIR` is set: `$PI_CODING_AGENT_DIR/mcp.json`
- Otherwise: `~/.pi/agent/mcp.json`

Use native Read/Edit/Write tools for JSON file edits. Use Bash only for
`mkdir`/`chmod` if needed.

Desired entry:

```json
{
  "url": "https://api.superset.sh/api/v2/agent/mcp",
  "auth": "bearer",
  "bearerTokenEnv": "SUPERSET_API_KEY",
  "lifecycle": "lazy",
  "directTools": [
    "hosts_list",
    "projects_list",
    "workspaces_list",
    "workspaces_create",
    "agents_list",
    "agents_run"
  ]
}
```

Merge it under `mcpServers.superset`.

Rules:

- If `mcpServers.superset` is missing, add it.
- If it exists and already matches, leave it unchanged.
- If it exists but points somewhere else, do not overwrite silently. Explain the
  difference and ask the user whether to replace it.
- Preserve all other `imports`, `settings`, and `mcpServers` entries.
- Create parent directories with mode `700` where possible.
- Set the MCP config file to mode `600` on Unix-like systems.

### 7. Configure the API key safely

Never ask the user to paste a Superset API key into chat.

Superset API keys are created in:

```text
Superset desktop app → Settings → API Keys → Create API Key
```

The key starts with `sk_live_` or `sk_test_` and is shown only once.

Preferred options:

1. User's shell / launcher environment exports `SUPERSET_API_KEY`.
2. User stores it in Firehorse's private env file. The bundled
   `firehorse-superset-env` extension loads this file into `process.env` for Pi
   sessions, but only if the file is private:

```sh
mkdir -p ~/.config/firehorse
chmod 700 ~/.config/firehorse
printf 'SUPERSET_API_KEY=sk_live_...\n' > ~/.config/firehorse/superset.env
chmod 600 ~/.config/firehorse/superset.env
```

If `~/.config/firehorse/superset.env` exists and is group/world-readable on a
Unix-like system, do not use it. Tell the user:

```sh
chmod 600 ~/.config/firehorse/superset.env
```

Do not write secrets into `.mcp.json`, `.pi/mcp.json`, project files, or git
worktrees.

### 8. Verify / refresh

After configuring MCP, tell the user:

```text
Restart/reload Pi, or run `/mcp reconnect superset` in a new session after the
API key is available.
```

If MCP tools are available in the current session, verify non-destructively by
listing or describing the `superset` server/tools. Do not create workspaces or
run agents during setup verification.

### 9. Optional Claude Code setup

If the user passed `--claude`, or explicitly asks to configure Claude too, use
the same Superset detection and API-key safety rules, then register Superset MCP
for Claude Code **user scope**.

Claude Code should use a dynamic `headersHelper` rather than a literal API key.
Create `~/.config/firehorse/superset-mcp-headers.mjs` (mode `700` on Unix-like
systems) that reads `SUPERSET_API_KEY` from the environment or from the private
`~/.config/firehorse/superset.env` file and prints:

```json
{ "Authorization": "Bearer <key>" }
```

Then register the MCP server with:

```sh
claude mcp add-json --scope user superset '{
  "type": "http",
  "url": "https://api.superset.sh/api/v2/agent/mcp",
  "headersHelper": "node \"$HOME/.config/firehorse/superset-mcp-headers.mjs\""
}'
```

Do not use Claude project scope (`.mcp.json`) for this personal Superset API key.
If the user primarily uses Claude Code, tell them the Firehorse Claude plugin
also exposes its own `firehorse-setup` skill with the full Claude-specific flow,
including claude-mem project-id patching via
`scripts/patch-claude-mem-project-env.cjs`.

### 10. Summary

Print:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FIREHORSE ► SETUP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then summarize:

- MCP config path
- Superset MCP status
- canonical memory project id
- API key status without printing the key
- Next command, if any

## Future setup sections

Add future one-time Firehorse setup here as separate idempotent sections. Each
section must support `--check`, preserve user config, and avoid writing secrets
to project-local files.
