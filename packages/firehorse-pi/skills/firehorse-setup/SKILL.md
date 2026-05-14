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

Status table shape:

```markdown
| Component               | Status                                    |
| ----------------------- | ----------------------------------------- |
| Firehorse package       | ✓ installed / ✗ missing                   |
| Superset detected       | ✓ yes / ○ no / ? inconclusive             |
| Superset API key        | ✓ env set / ✓ env file / ✗ missing        |
| Secret file permissions | ✓ private / ✗ too open / ○ not present    |
| Pi MCP config           | ✓ configured / ✗ missing / ⚠ needs update |
| pi-mcp-adapter          | ✓ available / ✗ missing                   |
| Superset env loader     | ✓ available / ✗ missing                   |
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

### 3. Configure Superset MCP for Pi

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

### 4. Configure the API key safely

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

### 5. Verify / refresh

After configuring MCP, tell the user:

```text
Restart/reload Pi, or run `/mcp reconnect superset` in a new session after the
API key is available.
```

If MCP tools are available in the current session, verify non-destructively by
listing or describing the `superset` server/tools. Do not create workspaces or
run agents during setup verification.

### 6. Optional Claude Code setup

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
also exposes its own `firehorse-setup` skill with the full Claude-specific flow.

### 7. Summary

Print:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FIREHORSE ► SETUP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then summarize:

- MCP config path
- Superset MCP status
- API key status without printing the key
- Next command, if any

## Future setup sections

Add future one-time Firehorse setup here as separate idempotent sections. Each
section must support `--check`, preserve user config, and avoid writing secrets
to project-local files.
