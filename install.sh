#!/usr/bin/env bash
#
# Firehorse installer.
#
#   curl -fsSL https://raw.githubusercontent.com/cinjoff/firehorse/main/install.sh | bash
#
# Wires up everything Firehorse needs: the three upstream marketplaces, the
# plugin itself, the MCP servers the workflows query, and the self-hosted
# supermemory stack that backs recall.
#
# Every step is idempotent. Re-running repairs rather than duplicates.
# Nothing here sends data off the machine except the plugin/model downloads.

set -euo pipefail

FIREHORSE_REPO="cinjoff/firehorse"
SUPERMEMORY_PORT=6767
SUPERMEMORY_MODEL="gpt-oss:20b"
OLLAMA_URL="http://localhost:11434"

CHECK_ONLY=0
ASSUME_YES=0
SKIP_MEMORY=0
SKIP_SUPERSET=0

# Summary rows, filled in as we go: "status<TAB>component<TAB>detail".
SUMMARY=()
FAILED=0

# ── Output ───────────────────────────────────────────────────────────────────

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; RESET=""
fi

ok()    { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
skip()  { printf '  %s○%s %s\n' "$DIM" "$RESET" "$1"; }
warn()  { printf '  %s⚠%s %s\n' "$YELLOW" "$RESET" "$1"; }
fail()  { printf '  %s✗%s %s\n' "$RED" "$RESET" "$1"; FAILED=1; }
note()  { printf '    %s%s%s\n' "$DIM" "$1" "$RESET"; }

# ── Progress ─────────────────────────────────────────────────────────────────

TTY=0
[ -t 1 ] && TTY=1

TOTAL_STEPS=6
CURRENT_STEP=0

# A 28-cell bar. Redrawn after each step so the user always knows how much is
# left — the memory phase alone can run for minutes on a cold model pull.
draw_bar() {
  local width=28 done_cells filled empty pct
  pct=$(( CURRENT_STEP * 100 / TOTAL_STEPS ))
  done_cells=$(( CURRENT_STEP * width / TOTAL_STEPS ))
  filled=""; empty=""
  local i=0
  while [ "$i" -lt "$done_cells" ]; do filled="${filled}█"; i=$((i + 1)); done
  while [ "$i" -lt "$width" ]; do empty="${empty}░"; i=$((i + 1)); done
  printf '  %s%s%s%s%s  %s%3d%%%s  %s(%d/%d)%s\n' \
    "$GREEN" "$filled" "$RESET" "$DIM" "$empty" \
    "$BOLD" "$pct" "$RESET" "$DIM" "$CURRENT_STEP" "$TOTAL_STEPS" "$RESET"
}

step() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
  printf '\n%s[%d/%d] ▸ %s%s\n' "$BOLD" "$CURRENT_STEP" "$TOTAL_STEPS" "$1" "$RESET"
}

# Close a step: draw the bar so progress is visible between phases.
end_step() { draw_bar; }

# An array, not a string: bash 3.2 slices strings by byte, and each braille
# frame is three bytes, so ${s:i:1} would cut them into mojibake.
SPIN_FRAMES=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏)

# Run a quiet command with a spinner. Its output is swallowed unless it fails,
# in which case the tail is shown. On a non-TTY (curl | bash into a log, CI)
# the spinner degrades to a single line with no escape codes.
# SEVERITY governs how spin/live report a non-zero exit: "hard" marks the whole
# run failed, "soft" only warns. Optional components use soft — a missing MCP
# server is worth a line, not a failed install.
SEVERITY="hard"
report_bad() {
  if [ "$SEVERITY" = "soft" ]; then warn "$1"; else fail "$1"; fi
}
# The soft variants always return 0. "Soft" means this component is optional, so
# a non-zero return would be a lie the caller has to remember to guard against —
# and an unguarded one trips `set -e` and aborts the whole install. They warn,
# record, and carry on; the summary table is where the outcome shows up.
spin_soft() { SEVERITY="soft"; spin "$@" || true; SEVERITY="hard"; return 0; }
live_soft() { SEVERITY="soft"; live "$@" || true; SEVERITY="hard"; return 0; }

spin() {
  local label="$1"; shift
  local log; log="$(mktemp -t firehorse-install)"

  if [ "$TTY" -eq 0 ]; then
    printf '  … %s\n' "$label"
    if "$@" >"$log" 2>&1; then rm -f "$log"; return 0; fi
    report_bad "$label"; tail -20 "$log" | sed 's/^/      /'; rm -f "$log"; return 1
  fi

  "$@" >"$log" 2>&1 &
  local pid=$! i=0 frame
  while kill -0 "$pid" 2>/dev/null; do
    frame="${SPIN_FRAMES[$(( i % 10 ))]}"
    printf '\r  %s%s%s %s' "$YELLOW" "$frame" "$RESET" "$label"
    i=$((i + 1))
    sleep 0.1
  done
  wait "$pid" 2>/dev/null
  local rc=$?
  printf '\r\033[K'
  if [ "$rc" -eq 0 ]; then
    ok "$label"; rm -f "$log"; return 0
  fi
  report_bad "$label"
  tail -20 "$log" | sed 's/^/      /'
  rm -f "$log"
  return 1
}

# For commands with their own progress output (model pulls, plugin installs).
# Framing it beats hiding it behind a spinner that reveals nothing.
live() {
  local label="$1"; shift
  printf '  %s⋯%s %s%s\n' "$YELLOW" "$RESET" "$label" "${DIM}"
  if "$@"; then printf '%s' "$RESET"; ok "$label"; return 0; fi
  printf '%s' "$RESET"; report_bad "$label"; return 1
}

record() { SUMMARY+=("$1	$2	$3"); }

have() { command -v "$1" >/dev/null 2>&1; }

# Substring test that does not pipe into grep. Under `set -o pipefail`, `grep -q`
# closes the pipe early and the producer dies of SIGPIPE (141), which reads as a
# false negative. Buffer the output, then match.
contains() {
  case "$1" in *"$2"*) return 0 ;; *) return 1 ;; esac
}

# In --check mode, describe the action instead of taking it.
would() {
  if [ "$CHECK_ONLY" -eq 1 ]; then
    skip "would run: $*"
    return 0
  fi
  return 1
}

confirm() {
  [ "$ASSUME_YES" -eq 1 ] && return 0
  [ -t 0 ] || return 0
  local reply
  printf '  %s? %s [Y/n] %s' "$BOLD" "$1" "$RESET"
  read -r reply || reply=""
  case "$reply" in [nN]*) return 1 ;; *) return 0 ;; esac
}

usage() {
  cat <<'EOF'
Firehorse installer

Usage: install.sh [options]

Options:
  --check           Report what is and is not set up. Writes nothing.
  --yes, -y         Accept every prompt. For non-interactive runs.
  --skip-memory     Do not set up the self-hosted supermemory stack.
  --skip-superset   Do not configure the Superset MCP server.
  --help, -h        Show this message.

What it does:
  1. Adds the impeccable, supermemory, and firehorse marketplaces.
  2. Installs the firehorse plugin and its three declared dependencies.
  3. Registers codebase-memory-mcp and supermemory-docs at user scope.
  4. Brings up the local supermemory server, model, credentials, and launchd job.
  5. Configures Superset MCP if Superset is detected.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --check) CHECK_ONLY=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    --skip-memory) SKIP_MEMORY=1 ;;
    --skip-superset) SKIP_SUPERSET=1 ;;
    --help|-h) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n\n' "$1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

printf '%s' "$BOLD"
cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FIREHORSE ► INSTALL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
printf '%s' "$RESET"
[ "$CHECK_ONLY" -eq 1 ] && printf '%sRead-only check. Nothing will be written.%s\n' "$DIM" "$RESET"

# ── 1. Preflight ─────────────────────────────────────────────────────────────

step "Preflight"

for tool in git curl; do
  if have "$tool"; then
    ok "$tool"
  else
    fail "$tool is required and was not found on PATH"
  fi
done

if have node; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "$NODE_MAJOR" -ge 20 ]; then
    ok "node $(node -v)"
  else
    fail "node $(node -v) is too old; Firehorse needs Node 20 or newer"
  fi
else
  fail "node was not found on PATH; install Node 20 or newer from https://nodejs.org"
fi

if have claude; then
  ok "claude $(claude --version 2>/dev/null | head -1)"
else
  fail "the claude CLI was not found on PATH"
  note "Install Claude Code first: https://claude.com/claude-code"
fi

if [ "$FAILED" -eq 1 ]; then
  printf '\n%sPreflight failed. Fix the above and re-run.%s\n' "$RED" "$RESET"
  exit 1
fi

record ok "Preflight" "node $(node -v), claude present"
end_step

# ── 2. Marketplaces ──────────────────────────────────────────────────────────

step "Marketplaces"

# name<TAB>source — the plugin's dependencies resolve only from marketplaces
# Claude Code already knows about, so these must precede the install.
MARKETPLACES=(
  "impeccable	pbakaus/impeccable"
  "supermemory-plugins	supermemoryai/claude-supermemory"
  "firehorse	$FIREHORSE_REPO"
)

marketplace_present() {
  local listing
  listing="$(claude plugin marketplace list 2>/dev/null || true)"
  contains "$listing" "$1"
}

for entry in "${MARKETPLACES[@]}"; do
  name="${entry%%	*}"
  source="${entry##*	}"
  if marketplace_present "$name"; then
    ok "$name already added"
    continue
  fi
  would "claude plugin marketplace add $source" && continue
  if spin "adding $name ($source)" claude plugin marketplace add "$source"; then
    :
  else
    note "Run it by hand: claude plugin marketplace add $source"
  fi
done

record ok "Marketplaces" "impeccable, supermemory-plugins, firehorse"
end_step

# ── 3. The plugin ────────────────────────────────────────────────────────────

step "Firehorse plugin"

PLUGIN_LISTING="$(claude plugin list 2>/dev/null || true)"
if contains "$PLUGIN_LISTING" "firehorse"; then
  ok "firehorse@firehorse already installed"
  note "Update it later with: claude plugin update firehorse@firehorse"
  record ok "Plugin" "already installed"
elif would "claude plugin install firehorse@firehorse"; then
  record skip "Plugin" "not installed (check mode)"
else
  # Installing pulls mattpocock-skills, impeccable, and supermemory with it.
  if live "installing firehorse@firehorse and its three dependencies" \
       claude plugin install firehorse@firehorse --scope user --yes; then
    record ok "Plugin" "installed with dependencies"
  else
    note "Run it by hand: claude plugin install firehorse@firehorse"
    record fail "Plugin" "install failed"
  fi
fi
end_step

# ── 4. MCP servers ───────────────────────────────────────────────────────────

step "MCP servers"

mcp_present() { claude mcp get "$1" >/dev/null 2>&1; }

# codebase-memory-mcp is a standalone server, not a plugin, so the plugin
# install does not pull it in. Register whatever the user already has.
CBM_BIN=""
for candidate in "$(command -v codebase-memory-mcp 2>/dev/null || true)" "$HOME/.local/bin/codebase-memory-mcp"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then CBM_BIN="$candidate"; break; fi
done

if mcp_present codebase-memory-mcp; then
  ok "codebase-memory-mcp already registered"
  record ok "codebase-memory-mcp" "registered"
elif [ -z "$CBM_BIN" ]; then
  warn "codebase-memory-mcp binary not found; skipping registration"
  note "The workflows query it for structure. Install it from its own upstream,"
  note "then: claude mcp add --scope user codebase-memory-mcp <path>"
  record warn "codebase-memory-mcp" "binary not installed"
elif would "claude mcp add --scope user codebase-memory-mcp $CBM_BIN"; then
  :
else
  if spin_soft "registering codebase-memory-mcp at user scope" \
       claude mcp add --scope user codebase-memory-mcp "$CBM_BIN"; then
    record ok "codebase-memory-mcp" "registered"
  else
    record warn "codebase-memory-mcp" "registration failed"
  fi
fi

if mcp_present supermemory-docs; then
  ok "supermemory-docs already registered"
elif would "claude mcp add --scope user --transport http supermemory-docs https://supermemory.ai/docs/mcp"; then
  :
else
  spin_soft "registering supermemory-docs (public docs, no user data)" \
    claude mcp add --scope user --transport http \
    supermemory-docs https://supermemory.ai/docs/mcp
fi
end_step

# ── 5. Memory ────────────────────────────────────────────────────────────────

SM_ENV="$HOME/.supermemory/env"
SM_LOG="$HOME/.supermemory/server.log"
SM_CREDS="$HOME/.supermemory-claude/credentials.json"
SM_PLIST="$HOME/Library/LaunchAgents/ai.supermemory.server.plist"
SM_BIN="$HOME/.local/bin/supermemory-server"

if [ "$SKIP_MEMORY" -eq 1 ]; then
  step "Memory"
  skip "skipped (--skip-memory)"
  record skip "Memory" "skipped by flag"
else
  step "Memory — local supermemory server"

  if ! have ollama; then
    warn "Ollama was not found; the memory stack needs it for extraction"
    note "Install it from https://ollama.com, then re-run this script."
    record warn "Memory" "Ollama missing"
  else
    ok "ollama present"

    # 5a. Server binary.
    if [ -x "$SM_BIN" ]; then
      ok "supermemory-server installed"
    elif would "npx -y supermemory@latest local install"; then
      :
    else
      live_soft "fetching the supermemory server binary" \
        npx -y supermemory@latest local install
    fi

    # 5b. Extraction model. It must support tool calling: a model that does not
    # still returns HTTP 200 and extracts zero memories, silently.
    OLLAMA_MODELS="$(ollama list 2>/dev/null || true)"
    if contains "$OLLAMA_MODELS" "$SUPERMEMORY_MODEL"; then
      ok "$SUPERMEMORY_MODEL present"
    elif would "ollama pull $SUPERMEMORY_MODEL"; then
      :
    else
      note "about 13 GB — ollama prints its own progress below"
      live_soft "pulling $SUPERMEMORY_MODEL" ollama pull "$SUPERMEMORY_MODEL"
    fi

    # 5c. Server config.
    if [ -f "$SM_ENV" ]; then
      ok "server config present ($SM_ENV)"
    elif would "write $SM_ENV"; then
      :
    else
      mkdir -p "$(dirname "$SM_ENV")"
      cat > "$SM_ENV" <<EOF
# Local self-hosted Supermemory server configuration.
# Extraction/summaries use an OpenAI-compatible endpoint; embeddings run locally.
OPENAI_BASE_URL=$OLLAMA_URL/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=$SUPERMEMORY_MODEL
SUPERMEMORY_DATA_DIR=$HOME/.supermemory/data
EOF
      chmod 600 "$SM_ENV"
      ok "wrote $SM_ENV (mode 600)"
    fi

    # 5d. launchd job, so the server survives a reboot. The plugin hooks fail
    # soft — with the server down a session looks normal and stores nothing.
    if [ "$(uname -s)" = "Darwin" ]; then
      if [ -f "$SM_PLIST" ]; then
        ok "launchd job present"
      elif would "write $SM_PLIST and launchctl load it"; then
        :
      else
        mkdir -p "$(dirname "$SM_PLIST")" "$HOME/.supermemory"
        cat > "$SM_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>ai.supermemory.server</string>
  <key>ProgramArguments</key>
  <array><string>$SM_BIN</string></array>
  <key>WorkingDirectory</key><string>$HOME/.supermemory</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$SM_LOG</string>
  <key>StandardErrorPath</key><string>$SM_LOG</string>
</dict>
</plist>
EOF
        launchctl load "$SM_PLIST" 2>/dev/null || true
        ok "wrote and loaded the launchd job"
      fi
    else
      note "Not macOS — start the server yourself: $SM_BIN"
    fi

    # 5e. Wait for the server, then lift its API key out of the log. The key is
    # printed on first boot and persists across restarts.
    SM_KEY=""
    if [ "$CHECK_ONLY" -eq 0 ]; then
      waited=0
      while [ "$waited" -lt 30 ]; do
        curl -fsS -o /dev/null "http://localhost:$SUPERMEMORY_PORT/" 2>/dev/null && break
        if [ "$TTY" -eq 1 ]; then
          printf '\r  %s%s%s waiting for the server on :%s (%ss)' \
            "$YELLOW" "${SPIN_FRAMES[$(( waited % 10 ))]}" "$RESET" \
            "$SUPERMEMORY_PORT" "$((30 - waited))"
        fi
        sleep 1
        waited=$((waited + 1))
      done
      [ "$TTY" -eq 1 ] && printf '\r\033[K'
    fi

    if curl -fsS -o /dev/null "http://localhost:$SUPERMEMORY_PORT/" 2>/dev/null; then
      ok "server responding on localhost:$SUPERMEMORY_PORT"
    else
      warn "server is not responding on localhost:$SUPERMEMORY_PORT"
      note "Check the log: $SM_LOG"
    fi

    if [ -f "$SM_CREDS" ]; then
      ok "plugin credentials present"
    else
      [ -f "$SM_LOG" ] && SM_KEY="$(grep -oE 'sm_[A-Za-z0-9_-]+' "$SM_LOG" 2>/dev/null | tail -1 || true)"
      if [ -z "$SM_KEY" ]; then
        warn "could not read the server API key from $SM_LOG"
        note "Start the server once by hand, copy the printed key, and write it to"
        note "$SM_CREDS as {\"apiKey\": \"sm_...\"}"
      elif would "write $SM_CREDS"; then
        :
      else
        mkdir -p "$(dirname "$SM_CREDS")"
        printf '{ "apiKey": "%s" }\n' "$SM_KEY" > "$SM_CREDS"
        chmod 600 "$SM_CREDS"
        ok "wrote plugin credentials (mode 600)"
      fi
    fi

    # 5f. Claude Code launched from an application sources no shell profile, so
    # these must live in settings.json or the hooks reach the hosted service.
    SETTINGS="$HOME/.claude/settings.json"
    SETTINGS_OK=0
    if [ -f "$SETTINGS" ]; then
      node -e '
        const fs = require("node:fs");
        const [file, port] = process.argv.slice(1);
        const env = (JSON.parse(fs.readFileSync(file, "utf8") || "{}").env) || {};
        const want = `http://localhost:${port}`;
        process.exit(env.SUPERMEMORY_API_URL === want ? 0 : 1);
      ' "$SETTINGS" "$SUPERMEMORY_PORT" 2>/dev/null && SETTINGS_OK=1
    fi

    if [ "$SETTINGS_OK" -eq 1 ]; then
      ok "settings.json already points supermemory at localhost"
    elif would "set SUPERMEMORY_API_URL and SUPERMEMORY_MCP_URL in $SETTINGS"; then
      :
    else
      mkdir -p "$(dirname "$SETTINGS")"
      [ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
      node -e '
        const fs = require("node:fs");
        const [file, port] = process.argv.slice(1);
        const settings = JSON.parse(fs.readFileSync(file, "utf8") || "{}");
        settings.env ??= {};
        settings.env.SUPERMEMORY_API_URL = `http://localhost:${port}`;
        settings.env.SUPERMEMORY_MCP_URL = `http://localhost:${port}/mcp`;
        fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
      ' "$SETTINGS" "$SUPERMEMORY_PORT"
      ok "pointed SUPERMEMORY_API_URL and SUPERMEMORY_MCP_URL at localhost"
    fi

    # 5g. Pin the model resident. Cold, a 13 GB load outlasts the server's
    # 30-second container-description budget and ingest retries forever.
    OLLAMA_RESIDENT="$(ollama ps 2>/dev/null || true)"
    if contains "$OLLAMA_RESIDENT" "$SUPERMEMORY_MODEL" && contains "$OLLAMA_RESIDENT" "Forever"; then
      ok "$SUPERMEMORY_MODEL already pinned resident"
    elif would "pin $SUPERMEMORY_MODEL resident"; then
      :
    else
      if curl -fsS -o /dev/null "$OLLAMA_URL/api/generate" \
           -d "{\"model\":\"$SUPERMEMORY_MODEL\",\"keep_alive\":-1}" 2>/dev/null; then
        ok "pinned $SUPERMEMORY_MODEL resident"
        note "Re-run this after every Ollama restart; the pin does not survive one."
      else
        warn "could not pin the model; ingest may stall on a cold load"
      fi
    fi

    record ok "Memory" "server, model, credentials, launchd"
  fi
fi
end_step

# ── 6. Superset ──────────────────────────────────────────────────────────────

step "Superset MCP"

superset_detected() {
  case "$PWD" in */.superset/worktrees/*) return 0 ;; esac
  [ -d "$HOME/.superset" ] && return 0
  [ -d "/Applications/Superset.app" ] && return 0
  [ -n "${SUPERSET_API_KEY:-}" ] && return 0
  [ -f "$HOME/.config/firehorse/superset.env" ] && return 0
  return 1
}

HELPER="$HOME/.config/firehorse/superset-mcp-headers.mjs"

if [ "$SKIP_SUPERSET" -eq 1 ]; then
  skip "skipped (--skip-superset)"
  record skip "Superset MCP" "skipped by flag"
elif ! superset_detected; then
  skip "Superset not detected"
  note "If you use Superset, re-run after setting SUPERSET_API_KEY."
  record skip "Superset MCP" "not detected"
elif mcp_present superset; then
  ok "superset already registered"
  record ok "Superset MCP" "registered"
elif would "write $HELPER and register the superset MCP server"; then
  [ -f "$HELPER" ] && ok "headers helper already present"
  record skip "Superset MCP" "not registered (check mode)"
else
  # The key never goes into MCP config. A headersHelper reads it at request time
  # from the environment or a private env file.
  mkdir -p "$HOME/.config/firehorse"
  chmod 700 "$HOME/.config/firehorse"
  cat > "$HELPER" <<'HELPER_EOF'
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
HELPER_EOF
  chmod 700 "$HELPER"
  ok "wrote the headers helper (mode 700)"

  if claude mcp add-json --scope user superset "{
    \"type\": \"http\",
    \"url\": \"https://api.superset.sh/api/v2/agent/mcp\",
    \"headersHelper\": \"node \\\"\$HOME/.config/firehorse/superset-mcp-headers.mjs\\\"\"
  }" >/dev/null 2>&1; then
    ok "registered superset at user scope"
    record ok "Superset MCP" "registered"
  else
    warn "could not register the superset MCP server"
    record warn "Superset MCP" "registration failed"
  fi

  if [ -z "${SUPERSET_API_KEY:-}" ] && [ ! -f "$HOME/.config/firehorse/superset.env" ]; then
    warn "no Superset API key found"
    note "Create one in Superset → Settings → API Keys, then:"
    note "  printf 'SUPERSET_API_KEY=sk_live_...\\n' > ~/.config/firehorse/superset.env"
    note "  chmod 600 ~/.config/firehorse/superset.env"
  fi
fi
end_step

# ── 7. Summary ───────────────────────────────────────────────────────────────

printf '\n%s' "$BOLD"
cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FIREHORSE ► SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
printf '%s' "$RESET"

for row in "${SUMMARY[@]}"; do
  status="${row%%	*}"
  rest="${row#*	}"
  component="${rest%%	*}"
  detail="${rest##*	}"
  case "$status" in
    ok)   mark="${GREEN}✓${RESET}" ;;
    warn) mark="${YELLOW}⚠${RESET}" ;;
    fail) mark="${RED}✗${RESET}" ;;
    *)    mark="${DIM}○${RESET}" ;;
  esac
  printf ' %b %-22s %s%s%s\n' "$mark" "$component" "$DIM" "$detail" "$RESET"
done

if [ "$CHECK_ONLY" -eq 1 ]; then
  printf '\n%sCheck complete. Re-run without --check to apply.%s\n' "$DIM" "$RESET"
  exit 0
fi

cat <<EOF

Next:
  1. Restart Claude Code so the plugin, hooks, and MCP servers load.
  2. Run /horse-map in a repo to open its wayfinder map.
  3. Verify anytime with: ./install.sh --check

Docs: https://github.com/$FIREHORSE_REPO
EOF

[ "$FAILED" -eq 1 ] && exit 1
exit 0
