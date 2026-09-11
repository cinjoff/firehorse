---
name: firehorse-setup
description: Run once after installing Firehorse for Claude Code. Checks Firehorse setup, verifies the codebase-memory graph requirement, detects Superset, and configures the user-scoped Superset MCP server safely. Use --check for read-only status.
---

# firehorse-setup

Run this once after installing the Firehorse Claude Code plugin.

## Relation to install.sh

`install.sh` in the Firehorse repository is the supported install path. It does
everything below plus the marketplaces, the plugin install, the MCP servers, and
the memory stack, and it is idempotent:

```sh
curl -fsSL https://raw.githubusercontent.com/cinjoff/firehorse/main/install.sh | bash
./install.sh --check   # read-only status, same shape as --check here
```

This skill covers the half that has to run from inside a Claude session, and
verifies the rest. Prefer the installer for first-time setup; reach for this
skill to check state or to configure Superset MCP on its own.

## Goals

- Verify the Firehorse Claude plugin is available.
- Verify `codebase-memory-mcp` is registered. `/firehorse:build`,
  `/firehorse:fix-bug`, and `/firehorse:index` declare it required, and it is a
  standalone server rather than a marketplace plugin, so no plugin dependency can
  check it.
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

## Setup status mode (`--check`)

Run detection only and present one concise table.

Check:

1. Firehorse Claude plugin presence:
   - Current skill is available, or Claude plugin files/settings mention
     `firehorse`.
2. Codebase-memory graph requirement:
   - `claude mcp get codebase-memory-mcp` succeeds, or `~/.claude.json` has
     `mcpServers.codebase-memory-mcp`.
3. Superset usage signals:
   - current path contains `/.superset/worktrees/`
   - `~/.superset/` exists
   - `/Applications/Superset.app` exists on macOS
   - `superset` CLI exists on `PATH`
   - `SUPERSET_API_KEY` is set
   - `~/.config/firehorse/superset.env` exists
4. Superset secret safety:
   - `~/.config/firehorse/superset.env` is missing, or has mode `600` on
     Unix-like systems.
5. Claude Code MCP config:
   - `~/.claude.json` has top-level `mcpServers.superset`, or
     `claude mcp get superset` succeeds for user scope.
   - Desired URL is `https://api.superset.sh/api/v2/agent/mcp`.
   - Desired transport/type is `http`.
   - Desired auth uses `headersHelper`, not a literal API key.
6. Firehorse header helper:
   - `~/.config/firehorse/superset-mcp-headers.mjs` exists and is not
     group/world-writable on Unix-like systems.

Status table shape:

```markdown
| Component               | Status                                    |
| ----------------------- | ----------------------------------------- |
| Firehorse Claude plugin | ✓ available / ✗ missing                   |
| codebase-memory-mcp     | ✓ registered / ✗ missing                  |
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

### 2. Verify the codebase-memory graph requirement

`/firehorse:build`, `/firehorse:fix-bug`, and `/firehorse:index` declare
`mcp:codebase-memory-mcp` as required. It is a standalone server, not a
marketplace plugin, so `plugin.json` `dependencies` cannot express it and this
check is the only thing that confirms it is there.

The server installs the `codebase-memory` skill — the query reference the graph
steps use — so one check covers both. Report, and do not install:

- `claude mcp get codebase-memory-mcp` succeeds → ✓ registered.
- Missing → ✗, and say which workflows are affected. Point the user at the
  server's own install instructions rather than guessing a command; Firehorse
  does not vendor it and does not know where this machine got the binary.

Absence is a warning, not a failure: the workflows still run, report the gap in
their first line, and fall back to grep with every result treated as incomplete.

### 3. Detect Superset

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

### 4. Configure the Superset API key safely

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

### 5. Write the Claude headers helper

Claude Code supports dynamic MCP request headers via `headersHelper`. Use that
rather than storing a literal `Authorization` header.

The helper ships beside this skill as `superset-mcp-headers.mjs`. Copy it —
never retype it — to `~/.config/firehorse/superset-mcp-headers.mjs`, then
`chmod 700` the copy:

```sh
mkdir -p ~/.config/firehorse
chmod 700 ~/.config/firehorse
cp "<this skill's directory>/superset-mcp-headers.mjs" \
  ~/.config/firehorse/superset-mcp-headers.mjs
chmod 700 ~/.config/firehorse/superset-mcp-headers.mjs
```

What it does: reads `SUPERSET_API_KEY` from the environment, falling back to
`FIREHORSE_SUPERSET_ENV_FILE` or `~/.config/firehorse/superset.env`; refuses a
group- or world-readable env file; and writes
`{"Authorization":"Bearer <key>"}` to stdout. The key never lands in MCP config.

`install.sh` carries a byte-identical copy in a heredoc, because it runs through
`curl | bash` and cannot read a repo file. A test in `firehorse-core` fails if
the two ever drift.

### 6. Register Superset MCP for Claude Code user scope

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

### 7. Verify / refresh

After registering MCP, tell the user:

```text
Restart/reload Claude Code, then run `/mcp` or `claude mcp get superset` to
confirm the Superset server is registered.
```

Verification must be non-destructive. Do not create Superset workspaces or run
agents during setup verification.

### 8. Summary

Print:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FIREHORSE ► CLAUDE SETUP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then summarize:

- codebase-memory-mcp status
- Claude MCP scope: user
- Claude MCP status
- header helper path
- API key status without printing the key
- next command, if any

## Future setup sections

Add future one-time Firehorse setup here as separate idempotent sections. Each
section must support `--check`, preserve user config, and avoid writing secrets
to project-local files.
