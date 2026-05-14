---
name: firehorse-setup
description: Run once after installing Firehorse for Claude Code. Checks Firehorse setup, detects Superset, and configures the user-scoped Superset MCP server safely. Use --check for read-only status.
---

# firehorse-setup

Run this once after installing the Firehorse Claude Code plugin.

## Goals

- Verify the Firehorse Claude plugin is available.
- Detect whether the user is using Superset.
- If Superset is detected, configure Superset MCP in Claude Code's **user**
  scope so it works across new projects and Superset workspaces.
- Keep Superset API keys out of project files, `.mcp.json`, git worktrees, and
  chat history.

## Arguments

Interpret the user's arguments naturally:

- `--check` / "check setup" / "verify" — read-only status report. Do not write.
- `--superset` / `--force-superset` — configure Superset MCP even if detection
  is inconclusive.
- `--no-superset` — skip Superset MCP setup.
- `--pi` — also offer Pi user-global MCP setup if Pi is installed.

## Setup status mode (`--check`)

Run detection only and present one concise table.

Check:

1. Firehorse Claude plugin presence:
   - Current skill is available, or Claude plugin files/settings mention
     `firehorse`.
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
4. Claude Code MCP config:
   - `~/.claude.json` has top-level `mcpServers.superset`, or
     `claude mcp get superset` succeeds for user scope.
   - Desired URL is `https://api.superset.sh/api/v2/agent/mcp`.
   - Desired transport/type is `http`.
   - Desired auth uses `headersHelper`, not a literal API key.
5. Firehorse header helper:
   - `~/.config/firehorse/superset-mcp-headers.mjs` exists and is not
     group/world-writable on Unix-like systems.

Status table shape:

```markdown
| Component               | Status                                    |
| ----------------------- | ----------------------------------------- |
| Firehorse Claude plugin | ✓ available / ✗ missing                   |
| Superset detected       | ✓ yes / ○ no / ? inconclusive             |
| Superset API key        | ✓ env set / ✓ env file / ✗ missing        |
| Secret file permissions | ✓ private / ✗ too open / ○ not present    |
| Header helper           | ✓ configured / ✗ missing / ⚠ needs update |
| Claude MCP config       | ✓ configured / ✗ missing / ⚠ needs update |
```

If anything needs action, show the exact next command or file path. Then stop.

## Full setup

### 1. Banner

Print:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FIREHORSE ► CLAUDE SETUP
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

If you use Superset, run this setup again with:
  firehorse-setup --superset
```

Continue with any other setup checks added to this skill in the future.

### 3. Configure the Superset API key safely

Never ask the user to paste a Superset API key into chat.

Superset API keys are created in:

```text
Superset desktop app → Settings → API Keys → Create API Key
```

The key starts with `sk_live_` or `sk_test_` and is shown only once.

Preferred options:

1. User's shell / launcher environment exports `SUPERSET_API_KEY`.
2. User stores it in Firehorse's private env file:

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

Do not write secrets into `.mcp.json`, `.claude/settings.json`,
`~/.claude.json`, project files, or git worktrees.

### 4. Write the Claude headers helper

Claude Code supports dynamic MCP request headers via `headersHelper`. Use this
instead of storing a literal `Authorization` header.

Create `~/.config/firehorse/superset-mcp-headers.mjs` with mode `700` on
Unix-like systems. Use native Write for the file, then Bash only for `chmod`.

File contents:

```js
#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const envFile =
  process.env.FIREHORSE_SUPERSET_ENV_FILE ||
  join(homedir(), ".config", "firehorse", "superset.env");

function isSecure(path) {
  if (platform() === "win32") return true;
  const mode = statSync(path).mode & 0o777;
  return (mode & 0o077) === 0;
}

function parseEnv(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

let apiKey = process.env.SUPERSET_API_KEY || "";

if (!apiKey && existsSync(envFile)) {
  if (!isSecure(envFile)) {
    console.error(`${envFile} must be private. Run: chmod 600 ${envFile}`);
    process.exit(1);
  }
  apiKey = parseEnv(readFileSync(envFile, "utf8")).SUPERSET_API_KEY || "";
}

if (!apiKey) {
  console.error("SUPERSET_API_KEY is not set and no private Firehorse env file was found.");
  process.exit(1);
}

process.stdout.write(JSON.stringify({ Authorization: `Bearer ${apiKey}` }));
```

### 5. Register Superset MCP for Claude Code user scope

Superset MCP v2 is a hosted HTTP MCP server. There is no npm MCP server binary
to install.

Register the server in Claude Code **user scope**, not project scope:

```sh
claude mcp add-json --scope user superset '{
  "type": "http",
  "url": "https://api.superset.sh/api/v2/agent/mcp",
  "headersHelper": "node \"$HOME/.config/firehorse/superset-mcp-headers.mjs\""
}'
```

Why user scope:

- Claude Code user-scoped MCP servers are stored in `~/.claude.json` and load in
  all projects.
- Project-scoped MCP servers live in `.mcp.json` and can be committed; do not
  use that for personal Superset credentials.

Rules:

- If `superset` already exists and matches, leave it unchanged.
- If `superset` exists but points somewhere else, do not overwrite silently.
  Explain the difference and ask the user whether to replace it.
- Prefer the `claude mcp add-json --scope user` command over manual JSON edits.
- If the Claude CLI is unavailable, explain that the user must run the command
  from a terminal with Claude Code installed.
- Do not put the API key in `--header`; use `headersHelper`.

### 6. Verify / refresh

After registering MCP, tell the user:

```text
Restart/reload Claude Code, then run `/mcp` or `claude mcp get superset` to
confirm the Superset server is registered.
```

Verification must be non-destructive. Do not create Superset workspaces or run
agents during setup verification.

### 7. Optional Pi setup

If the user passed `--pi`, or explicitly asks to configure Pi too, use the same
Superset detection and API-key safety rules, then configure Pi's user-global MCP
file (`$PI_CODING_AGENT_DIR/mcp.json` or `~/.pi/agent/mcp.json`) with:

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

Preserve all other Pi MCP config entries. Never write the API key into the Pi
MCP file.

### 8. Summary

Print:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FIREHORSE ► CLAUDE SETUP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then summarize:

- Claude MCP scope: user
- Claude MCP status
- header helper path
- API key status without printing the key
- next command, if any

## Future setup sections

Add future one-time Firehorse setup here as separate idempotent sections. Each
section must support `--check`, preserve user config, and avoid writing secrets
to project-local files.
