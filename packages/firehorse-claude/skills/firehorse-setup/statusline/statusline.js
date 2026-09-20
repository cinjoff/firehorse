#!/usr/bin/env node
// Claude Code statusline.
//
// Line 1 (rendered here, synchronously): model | dir/branch | context against a
// budget | skills loaded this session.
// Line 2 (rendered by ccstatusline, cached): git dirty state, session clock and
// cost, compactions, 5-hour block usage, weekly usage and reset.
//
// ccstatusline takes ~1.2s per render, so it never runs in the request path.
// This script serves the last cached line and refreshes it in a detached child.
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

// Keep a session under this much live context. Matt Pocock's rule of thumb is
// to stop around 60% of the window; this is the same idea as an absolute number.
const BUDGET = Number(process.env.CLAUDE_CTX_BUDGET || 150000);
const BAR_WIDTH = 10;
const MAX_SKILLS_SHOWN = 3;
const CCSL_TTL_MS = Number(process.env.CLAUDE_STATUSLINE_CCSL_TTL || 15) * 1000;
const CCSL_CONFIG =
  process.env.CLAUDE_STATUSLINE_CCSL_CONFIG ||
  path.join(os.homedir(), ".claude", "statusline", "ccstatusline.json");

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  orange: (s) => `\x1b[38;5;208m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

const short = (n) => (n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));

// --- context against the budget -----------------------------------------
function contextSegment(data) {
  const cw = data.context_window || {};
  let used = cw.total_input_tokens;
  if (typeof used !== "number" || used === 0) {
    const u = cw.current_usage;
    if (u)
      used =
        (u.input_tokens || 0) +
        (u.cache_creation_input_tokens || 0) +
        (u.cache_read_input_tokens || 0);
  }
  if (typeof used !== "number") return "";

  const pct = Math.round((used / BUDGET) * 100);
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((used / BUDGET) * BAR_WIDTH)));
  const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);

  let paint = C.green;
  if (pct >= 100) paint = C.red;
  else if (pct >= 85) paint = C.orange;
  else if (pct >= 60) paint = C.yellow;

  const over = pct >= 100 ? " ⚠" : "";
  const label = `${bar} ${short(used)}/${short(BUDGET)} ${pct}%${over}`;

  const size = cw.context_window_size;
  const windowPct =
    typeof cw.used_percentage === "number"
      ? Math.round(cw.used_percentage)
      : typeof size === "number" && size > 0
        ? Math.round((used / size) * 100)
        : null;
  const tail = windowPct === null ? "" : C.dim(` (${windowPct}% of ${short(size)})`);

  return paint(label) + tail;
}

// --- skills -------------------------------------------------------------
// The statusline payload carries no skill list, so scan the session transcript
// for Skill tool calls. Only bytes appended since the last run are read.
function skillsSegment(data) {
  const tp = data.transcript_path;
  if (!tp || !fs.existsSync(tp)) return "";

  const sid = data.session_id || path.basename(tp, ".jsonl");
  const cachePath = path.join(os.tmpdir(), `claude-skills-${sid}.json`);

  let cache = { offset: 0, skills: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    if (raw && typeof raw.offset === "number" && Array.isArray(raw.skills)) cache = raw;
  } catch (e) {
    /* cold start */
  }

  let size;
  try {
    size = fs.statSync(tp).size;
  } catch (e) {
    return "";
  }
  if (size < cache.offset) cache = { offset: 0, skills: [] }; // file rotated

  if (size > cache.offset) {
    let chunk = "";
    try {
      const fd = fs.openSync(tp, "r");
      const buf = Buffer.alloc(size - cache.offset);
      fs.readSync(fd, buf, 0, buf.length, cache.offset);
      fs.closeSync(fd);
      chunk = buf.toString("utf8");
    } catch (e) {
      return renderSkills(cache.skills);
    }

    const lastNl = chunk.lastIndexOf("\n");
    const consumed = lastNl === -1 ? 0 : lastNl + 1;
    const text = chunk.slice(0, consumed);

    const re = /"name"\s*:\s*"Skill"\s*,\s*"input"\s*:\s*\{\s*"skill"\s*:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (!cache.skills.includes(m[1])) cache.skills.push(m[1]);
    }
    cache.offset += consumed;
    try {
      fs.writeFileSync(cachePath, JSON.stringify(cache));
    } catch (e) {
      /* best effort */
    }
  }

  return renderSkills(cache.skills);
}

function renderSkills(skills) {
  if (!skills.length) return "";
  const names = skills.map((s) => s.split(":").pop());
  const recent = names.slice(-MAX_SKILLS_SHOWN).reverse();
  const extra = names.length - recent.length;
  return C.cyan("⚙ ") + C.dim(recent.join(", ") + (extra > 0 ? ` +${extra}` : ""));
}

// --- place and model ----------------------------------------------------
function placeSegment(data) {
  const dir = data.workspace?.current_dir || data.cwd || process.cwd();
  const name = path.basename(dir);
  const wt = data.worktree?.name || data.workspace?.git_worktree;
  const branch = data.worktree?.branch;
  let out = C.dim(name);
  if (branch && branch !== name) out += C.dim(` ⎇ ${branch}`);
  else if (wt && wt !== name) out += C.dim(` ⎇ ${wt}`);
  return out;
}

function modelSegment(data) {
  let name = data.model?.display_name || "Claude";
  if (data.fast_mode) name += " ⚡";
  const effort = data.effort?.level;
  if (effort && effort !== "medium") name += C.dim(`:${effort}`);
  return C.bold(name);
}

// --- ccstatusline line (cached, refreshed out of band) ------------------
function resolveCcstatusline() {
  const explicit = process.env.CLAUDE_STATUSLINE_CCSL;
  if (explicit) return fs.existsSync(explicit) ? explicit : null;

  const dirs = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  // Claude Code may hand the statusline a minimal PATH, so also check the
  // usual global bin directories, including every installed nvm version.
  const home = os.homedir();
  dirs.push(
    "/usr/local/bin",
    "/opt/homebrew/bin",
    path.join(home, ".local", "bin"),
    path.join(home, ".bun", "bin"),
  );
  const nvm = path.join(home, ".local", "share", "nvm");
  for (const base of [nvm, path.join(home, ".nvm", "versions", "node")]) {
    try {
      for (const v of fs.readdirSync(base)) dirs.push(path.join(base, v, "bin"));
    } catch (e) {
      /* no nvm */
    }
  }
  for (const d of dirs) {
    const p = path.join(d, "ccstatusline");
    try {
      if (fs.statSync(p).isFile()) return p;
    } catch (e) {
      /* next */
    }
  }
  return null;
}

function termWidth() {
  const env = Number(process.env.CLAUDE_STATUSLINE_WIDTH);
  if (Number.isFinite(env) && env > 0) return Math.round(env);
  for (const stream of [process.stderr, process.stdout]) {
    if (stream && Number.isFinite(stream.columns) && stream.columns > 0) return stream.columns;
  }
  return 200;
}

function shq(v) {
  return "'" + String(v).replace(/'/g, "'\\''") + "'";
}

function ccstatuslineSegment(data, rawInput) {
  if (!fs.existsSync(CCSL_CONFIG)) return "";
  const sid = (data.session_id || "default").replace(/[^A-Za-z0-9_-]/g, "");
  const cachePath = path.join(os.tmpdir(), `claude-ccsl-${sid}.txt`);
  const lockPath = `${cachePath}.lock`;

  let text = "";
  try {
    text = fs.readFileSync(cachePath, "utf8").replace(/\n+$/, "");
  } catch (e) {
    /* cold start */
  }

  let stampedAt = 0;
  try {
    stampedAt = fs.statSync(lockPath).mtimeMs;
  } catch (e) {
    /* never refreshed */
  }

  if (Date.now() - stampedAt > CCSL_TTL_MS) {
    const bin = resolveCcstatusline();
    // Stamp before spawning so concurrent renders do not all launch a refresh.
    if (bin) {
      try {
        fs.writeFileSync(lockPath, "");
      } catch (e) {}
      refresh(bin, rawInput, cachePath);
    }
  }
  return text;
}

// The child writes the cache itself and is fully detached, so rendering never
// waits on ccstatusline's ~1.2s startup. A partial write can never be read
// because the output lands on a temp path and is moved into place atomically.
function refresh(bin, rawInput, cachePath) {
  try {
    const tmp = `${cachePath}.${process.pid}.part`;
    // No `exec` here: it would replace the shell and the mv would never run.
    const cmd =
      `${shq(bin)} --config ${shq(CCSL_CONFIG)} > ${shq(tmp)} 2>/dev/null` +
      ` && mv -f ${shq(tmp)} ${shq(cachePath)} || rm -f ${shq(tmp)}`;
    const child = spawn("/bin/sh", ["-c", cmd], {
      detached: true,
      stdio: ["pipe", "ignore", "ignore"],
      // The detached child has no TTY, so ccstatusline cannot probe a width and
      // would truncate the line. CCSTATUSLINE_WIDTH is checked before probing
      // and is documented to work from a wrapper process.
      env: { ...process.env, FORCE_COLOR: "1", CCSTATUSLINE_WIDTH: String(termWidth()) },
    });
    child.on("error", () => {});
    child.stdin.on("error", () => {});
    child.stdin.end(rawInput);
    child.unref();
  } catch (e) {
    /* refresh is best effort */
  }
}

// --- main ---------------------------------------------------------------
let input = "";
const guard = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => {
  input += c;
});
process.stdin.on("end", () => {
  clearTimeout(guard);
  try {
    const data = JSON.parse(input);
    if (process.env.CLAUDE_STATUSLINE_DEBUG) {
      try {
        fs.writeFileSync(path.join(os.tmpdir(), "claude-statusline-payload.json"), input);
      } catch (e) {}
    }
    const line1 = [
      modelSegment(data),
      placeSegment(data),
      contextSegment(data),
      skillsSegment(data),
    ]
      .filter(Boolean)
      .join(C.dim(" │ "));

    const line2 = ccstatuslineSegment(data, input);
    process.stdout.write(line2 ? `${line1}\n${line2}` : line1);
  } catch (e) {
    // Never break the prompt.
  }
});
