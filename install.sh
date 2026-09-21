#!/usr/bin/env bash
#
# Firehorse installer.
#
#   curl -fsSL https://raw.githubusercontent.com/cinjoff/firehorse/main/install.sh | bash
#
# Wires up everything Firehorse needs: the three upstream marketplaces, the
# plugin itself, the MCP servers the workflows query, and the provider settings
# for claude-mem, the plugin that backs recall.
#
# Every step is idempotent. Re-running repairs rather than duplicates.
# The installer itself sends nothing off the machine except the plugin
# downloads. Where claude-mem sends session content afterwards is what the
# memory step settles, and it prints that on screen before it writes.

set -euo pipefail

FIREHORSE_REPO="cinjoff/firehorse"

CHECK_ONLY=0
ASSUME_YES=0
SKIP_MEMORY=0
SKIP_SUPERSET=0
SKIP_STATUSLINE=0
FORCE_STATUSLINE=0

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

# Seven steps run: the two Memory branches are mutually exclusive, so only one
# of the eight `step` calls below fires.
TOTAL_STEPS=7
CURRENT_STEP=0

# A 28-cell bar. Redrawn after each step so the user always knows how much is
# left: the plugin install alone can run for minutes on a slow connection.
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

# Exact-entry test against a `claude plugin list` / `marketplace list` listing.
# Both print one `  ❯ <name>` line per entry, so anchor on that: a substring
# match is wrong here, because a marketplace named `firehorse` makes every
# `<plugin>@firehorse` line match a search for `firehorse@firehorse`.
#
# It also avoids piping into `grep -q`, which under `set -o pipefail` kills the
# producer with SIGPIPE (141) and reads as a false negative.
listed() {
  local line trimmed
  while IFS= read -r line; do
    trimmed="${line#"${line%%[![:space:]]*}"}"
    [ "$trimmed" = "❯ $2" ] && return 0
  done <<< "$1"
  return 1
}

# Loose substring test, for output with no per-entry structure to anchor on.
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
  --no-statusline   Skip installing the Firehorse status line.
  --force-statusline  Replace an existing statusLine.command that is not ours.
  --yes, -y         Accept every prompt. For non-interactive runs.
  --skip-memory     Do not write the claude-mem provider settings.
  --skip-superset   Do not configure the Superset MCP server.
  --help, -h        Show this message.

What it does:
  1. Adds the impeccable, thedotmack, and firehorse marketplaces.
  2. Installs the firehorse plugin and its three declared dependencies,
     claude-mem among them.
  3. Registers codebase-memory-mcp at user scope.
  4. Writes claude-mem's provider settings: compression through your local
     claude CLI, telemetry and cloud sync off. It keeps any value you set.
  5. Configures Superset MCP if Superset is detected.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --check) CHECK_ONLY=1 ;;
    --no-statusline) SKIP_STATUSLINE=1 ;;
    --force-statusline) FORCE_STATUSLINE=1 ;;
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
  "thedotmack	thedotmack/claude-mem"
  "firehorse	$FIREHORSE_REPO"
)

marketplace_present() {
  local listing
  listing="$(claude plugin marketplace list 2>/dev/null || true)"
  listed "$listing" "$1"
}

MARKETPLACES_MISSING=0
for entry in "${MARKETPLACES[@]}"; do
  name="${entry%%	*}"
  source="${entry##*	}"
  if marketplace_present "$name"; then
    ok "$name already added"
    continue
  fi
  MARKETPLACES_MISSING=$((MARKETPLACES_MISSING + 1))
  would "claude plugin marketplace add $source" && continue
  if spin "adding $name ($source)" claude plugin marketplace add "$source"; then
    :
  else
    note "Run it by hand: claude plugin marketplace add $source"
  fi
done

if [ "$MARKETPLACES_MISSING" -eq 0 ]; then
  record ok "Marketplaces" "all three already added"
elif [ "$CHECK_ONLY" -eq 1 ]; then
  record skip "Marketplaces" "$MARKETPLACES_MISSING missing (check mode)"
else
  record ok "Marketplaces" "added $MARKETPLACES_MISSING of three"
fi
end_step

# ── 3. The plugin ────────────────────────────────────────────────────────────

step "Firehorse plugin"

PLUGIN_LISTING="$(claude plugin list 2>/dev/null || true)"
if listed "$PLUGIN_LISTING" "firehorse@firehorse"; then
  ok "firehorse@firehorse already installed"
  note "Update it later with: claude plugin update firehorse@firehorse"
  record ok "Plugin" "already installed"
elif would "claude plugin install firehorse@firehorse"; then
  record skip "Plugin" "not installed (check mode)"
else
  # Installing pulls mattpocock-skills, impeccable, and claude-mem with it.
  if live "installing firehorse@firehorse and its dependencies" \
       claude plugin install firehorse@firehorse --scope user --yes; then
    record ok "Plugin" "installed with dependencies"
  else
    note "Run it by hand: claude plugin install firehorse@firehorse"
    record fail "Plugin" "install failed"
  fi
fi
end_step

# ── 3b. Status line ──────────────────────────────────────────────────────────

step "Status line"

SL_DIR="$HOME/.claude/statusline"
SL_SCRIPT="$SL_DIR/statusline.js"
SL_CONFIG="$SL_DIR/ccstatusline.json"
SL_SETTINGS="$HOME/.claude/settings.json"
SL_SRC="packages/firehorse-claude/skills/firehorse-setup/statusline"
SL_RAW="https://raw.githubusercontent.com/$FIREHORSE_REPO/main/$SL_SRC"

# Works from a clone and from `curl | bash`, where there is no checkout to read.
fetch_statusline_file() {
  local name="$1" dest="$2"
  if [ -f "$SL_SRC/$name" ]; then
    cp "$SL_SRC/$name" "$dest"
  else
    curl -fsSL "$SL_RAW/$name" -o "$dest"
  fi
}

if [ "$SKIP_STATUSLINE" -eq 1 ]; then
  skip "skipped (--no-statusline)"
  record skip "Status line" "skipped by flag"
elif ! have node; then
  warn "node not found; the status line needs it"
  record skip "Status line" "node missing"
elif would "install the Firehorse status line into $SL_DIR"; then
  record skip "Status line" "not installed (check mode)"
else
  mkdir -p "$SL_DIR"

  # statusline.js is ours, so it is replaced every run. ccstatusline.json is the
  # user's to edit, so it is only written when absent.
  if fetch_statusline_file statusline.js "$SL_SCRIPT"; then
    chmod 755 "$SL_SCRIPT"
    ok "installed $SL_SCRIPT"
  else
    fail "could not fetch statusline.js"
  fi

  if [ -f "$SL_CONFIG" ]; then
    skip "kept your existing ccstatusline.json"
  elif fetch_statusline_file ccstatusline.json "$SL_CONFIG"; then
    ok "installed $SL_CONFIG"
  else
    warn "could not fetch ccstatusline.json; the second line will be absent"
  fi

  # ccstatusline renders the second line. Without it the first line still works,
  # so a failure here is a warning. Global, never npx: npx re-resolves the
  # package on every refresh and multiplies the render cost.
  if have ccstatusline; then
    ok "ccstatusline already on PATH"
  elif have npm; then
    if live "installing ccstatusline" npm install -g ccstatusline@latest; then
      ok "installed ccstatusline"
    else
      warn "ccstatusline install failed; the usage line will be absent"
    fi
  else
    warn "npm not found; skipping ccstatusline (the usage line will be absent)"
  fi

  # Never clobber a status line the user already chose.
  mkdir -p "$(dirname "$SL_SETTINGS")"
  [ -f "$SL_SETTINGS" ] || echo '{}' > "$SL_SETTINGS"
  SL_RESULT=0
  SL_ERR="$(mktemp -t firehorse-statusline)"
  FIREHORSE_FORCE_STATUSLINE="$FORCE_STATUSLINE" node -e '
    const fs = require("node:fs");
    const file = process.argv[1];
    const settings = JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    const want = "node \"$HOME/.claude/statusline/statusline.js\"";
    const current = settings.statusLine?.command;
    const ours = current === want || (current ?? "").includes("statusline/statusline.js");
    if (current && !ours && process.env.FIREHORSE_FORCE_STATUSLINE !== "1") {
      console.error(current);
      process.exit(2);
    }
    settings.statusLine = { type: "command", command: want, padding: 0, refreshInterval: 10 };
    fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
  ' "$SL_SETTINGS" 2>"$SL_ERR" || SL_RESULT=$?

  if [ "$SL_RESULT" -eq 0 ]; then
    ok "pointed statusLine.command at the Firehorse status line"
    note "Takes effect after you restart or reload Claude Code."
    record ok "Status line" "installed"
  elif [ "$SL_RESULT" -eq 2 ]; then
    warn "you already have a status line; leaving it alone"
    note "Yours: $(cat "$SL_ERR")"
    note "Replace it with: ./install.sh --force-statusline"
    record skip "Status line" "left your own in place"
  else
    fail "could not update $SL_SETTINGS"
    record fail "Status line" "settings.json update failed"
  fi
  rm -f "$SL_ERR"
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
  note "The workflows query it for structure, and it installs the codebase-memory"
  note "skill they use for query syntax. Install it from its own upstream,"
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

end_step

# ── 5. Memory ────────────────────────────────────────────────────────────────

# claude-mem is a declared plugin dependency, so the install above already
# brought it in, and it bootstraps its own Bun and uv runtime on first run.
# What is left is the provider posture. The marketplace route runs no
# interactive picker, so this is where the provider actually gets chosen.
CM_SETTINGS="$HOME/.claude-mem/settings.json"

if [ "$SKIP_MEMORY" -eq 1 ]; then
  step "Memory"
  skip "skipped (--skip-memory)"
  note "claude-mem is still installed as a plugin dependency. Only its provider"
  note "settings were left untouched, so it will use its own defaults."
  record skip "Memory" "settings skipped by flag"
else
  step "Memory — claude-mem provider settings"

  # These settings decide where session content goes, so say so before writing.
  note "claude-mem compresses each session into observations, and that compression"
  note "is a model call. Firehorse points it at Anthropic on the plan this session"
  note "already bills to, so transcript content leaves this machine under your own"
  note "account. Nothing goes to cmem.ai. Reporting is left off:"
  note "  CLAUDE_MEM_PROVIDER=claude, CLAUDE_MEM_CLAUDE_AUTH_METHOD=cli"
  note "  CLAUDE_MEM_TELEMETRY=0, CLAUDE_MEM_TELEMETRY_ERRORS=0"
  note "  cloud-sync credentials left empty, so nothing uploads to cmem.ai"
  note "They go in $CM_SETTINGS."
  note "The auth-method key is documentation: claude-mem picks the auth path from"
  note "$HOME/.claude-mem/.env, which this script only reads."
  note "Any value you already set is kept. Re-run with --skip-memory to write none."

  # ~/.claude-mem/.env is what actually selects the auth path; the settings key
  # above is documentation. Read it so the script never claims a posture the
  # machine is not in. Read only: a key here was put there deliberately.
  CM_ENV="$HOME/.claude-mem/.env"
  if [ -f "$CM_ENV" ] && grep -qE '^[[:space:]]*(ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|ANTHROPIC_BASE_URL)=' "$CM_ENV" 2>/dev/null; then
    warn "$CM_ENV already selects a different auth path"
    note "It sets one of ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or"
    note "ANTHROPIC_BASE_URL, so compression runs in api-key or gateway mode"
    note "rather than on this session's plan. Firehorse has not changed it."
    note "Remove that key yourself if you want the posture above."
  fi

  if would "write the provider settings to $CM_SETTINGS"; then
    record skip "Memory" "settings not written (check mode)"
  else
    # Merge, never overwrite: a key already in the file is reported and left
    # alone, and a file that does not parse is left alone entirely.
    CM_RESULT=0
    CM_ERR="$(mktemp -t firehorse-claude-mem)"
    CM_OUT="$(node -e '
      const fs = require("node:fs");
      const path = require("node:path");
      const file = process.argv[1];
      let settings = {};
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf8").trim();
        if (raw) settings = JSON.parse(raw);
      }
      const want = {
        CLAUDE_MEM_PROVIDER: "claude",
        CLAUDE_MEM_CLAUDE_AUTH_METHOD: "cli",
        CLAUDE_MEM_TELEMETRY: "0",
        CLAUDE_MEM_TELEMETRY_ERRORS: "0",
        CLAUDE_MEM_CLOUD_SYNC_TOKEN: "",
        CLAUDE_MEM_CLOUD_SYNC_USER_ID: "",
        CLAUDE_MEM_CLOUD_SYNC_HUB_URL: "",
      };
      // The auth method only means anything under provider=claude, so do not
      // add it to a file that has already chosen a different provider.
      const theirProvider = String(settings.CLAUDE_MEM_PROVIDER ?? "");
      if (theirProvider && theirProvider !== "claude") delete want.CLAUDE_MEM_CLAUDE_AUTH_METHOD;
      const lines = [];
      let added = 0;
      for (const [key, value] of Object.entries(want)) {
        if (Object.prototype.hasOwnProperty.call(settings, key)) {
          const mine = String(settings[key] ?? "");
          // A sync token is a credential. Report that it is set, never what it is.
          const shown = /TOKEN|KEY|USER_ID/.test(key) ? "(set)" : mine;
          if (mine !== value) lines.push(`kept ${key}=${shown}`);
          continue;
        }
        settings[key] = value;
        added += 1;
      }
      if (added > 0) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
      }
      lines.unshift(`added ${added}`);
      console.log(lines.join("\n"));
    ' "$CM_SETTINGS" 2>"$CM_ERR")" || CM_RESULT=$?

    if [ "$CM_RESULT" -ne 0 ]; then
      warn "could not update $CM_SETTINGS; left it as it was"
      note "$(grep -m1 -E 'Error' "$CM_ERR" 2>/dev/null || true)"
      note "Set the values above by hand, or move the file aside and re-run."
      record warn "Memory" "settings not written"
    else
      CM_ADDED=0
      CM_KEPT=0
      while IFS=' ' read -r verb detail; do
        case "$verb" in
          added) CM_ADDED="$detail" ;;
          kept)  CM_KEPT=$((CM_KEPT + 1)); warn "kept your own $detail" ;;
        esac
      done <<< "$CM_OUT"

      if [ "$CM_ADDED" -gt 0 ]; then
        ok "wrote $CM_ADDED of the settings above to $CM_SETTINGS"
      else
        ok "$CM_SETTINGS already carries every setting above"
      fi

      if [ "$CM_KEPT" -gt 0 ]; then
        note "Firehorse changed no value you had already chosen. Edit"
        note "$CM_SETTINGS yourself if you want the posture above."
        note "A restart of the claude-mem worker picks up whatever you change."
        record ok "Memory" "provider set, $CM_KEPT of your values kept"
      else
        record ok "Memory" "provider claude, telemetry and cloud sync off"
      fi
    fi
    rm -f "$CM_ERR"
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
  2. Run /firehorse:map in a repo to open its wayfinder map.
  3. Verify anytime with: ./install.sh --check

Docs: https://github.com/$FIREHORSE_REPO
EOF

[ "$FAILED" -eq 1 ] && exit 1
exit 0
