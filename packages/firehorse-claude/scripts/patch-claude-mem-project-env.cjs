#!/usr/bin/env node
/**
 * Patch installed claude-mem bundles so project identity is stable across
 * Superset/git worktrees.
 *
 * Upstream claude-mem v13 derives worktree observations as parent/worktree.
 * Firehorse wants memories for Superset workspaces to land under the canonical
 * repository project (for example `firehorse`) so Claude, Pi, and subagents all
 * search the same project id. This patch changes the compiled getProjectContext
 * helper in installed claude-mem scripts to:
 *
 *   1. honor CLAUDE_MEM_PROJECT or FIREHORSE_PROJECT_NAME when set;
 *   2. fall back to upstream behavior when no explicit project id is set.
 *
 * Do not infer the canonical project from git parent directories here:
 * Conductor/Superset worktrees may be stored outside the canonical repo root.
 *
 * Re-run after claude-mem updates. Use --check for setup diagnostics.
 */

const fs = require("node:fs");
const path = require("node:path");
const { homedir } = require("node:os");

const CHECK_ONLY = process.argv.includes("--check");
const VERBOSE = process.argv.includes("--verbose") || !CHECK_ONLY;

const IDENT = "[A-Za-z_$][\\w$]*";
const CONTEXT_RE = new RegExp(
  `function (${IDENT})\\((${IDENT})\\)\\{` +
    `let (${IDENT})=(${IDENT})\\(\\2\\);` +
    `if\\(!\\2\\)return\\{primary:\\3,parent:null,isWorktree:!1,allProjects:\\[\\3\\]\\};` +
    `let (${IDENT})=(${IDENT})\\(\\2\\),(${IDENT})=(${IDENT})\\(\\5\\);` +
    `if\\(\\7\\.isWorktree&&\\7\\.parentProjectName\\)\\{` +
    `let (${IDENT})=\`\\$\\{\\7\\.parentProjectName\\}/\\$\\{\\3\\}\`;` +
    `return\\{primary:\\9,parent:\\7\\.parentProjectName,isWorktree:!0,allProjects:\\[\\7\\.parentProjectName,\\9\\]\\}` +
    `\\}` +
    `return\\{primary:\\3,parent:null,isWorktree:!1,allProjects:\\[\\3\\]\\}` +
    `\\}`,
  "g",
);

function replacement(
  _match,
  fnName,
  argName,
  projectVar,
  getProjectName,
  expandedVar,
  expandPath,
  worktreeVar,
  detectWorktree,
  parentVar,
) {
  return (
    `function ${fnName}(${argName}){` +
    `let fh=typeof process!=="undefined"&&process.env&&(process.env.CLAUDE_MEM_PROJECT||process.env.FIREHORSE_PROJECT_NAME);` +
    `if(fh&&fh.trim()!==""){let ${projectVar}=fh.trim();return{primary:${projectVar},parent:null,isWorktree:!1,allProjects:[${projectVar}]}}` +
    `let ${projectVar}=${getProjectName}(${argName});` +
    `if(!${argName})return{primary:${projectVar},parent:null,isWorktree:!1,allProjects:[${projectVar}]};` +
    `let ${expandedVar}=${expandPath}(${argName}),${worktreeVar}=${detectWorktree}(${expandedVar});` +
    `if(${worktreeVar}.isWorktree&&${worktreeVar}.parentProjectName){let ${parentVar}=${worktreeVar}.parentProjectName+"/"+${projectVar};return{primary:${parentVar},parent:${worktreeVar}.parentProjectName,isWorktree:!0,allProjects:[${worktreeVar}.parentProjectName,${parentVar}]}}` +
    `return{primary:${projectVar},parent:null,isWorktree:!1,allProjects:[${projectVar}]}}`
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function candidateRoots() {
  const home = homedir();
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude");
  const explicitRoots = [
    process.env.FIREHORSE_CLAUDE_MEM_PLUGIN_ROOT,
    process.env.CLAUDE_MEM_PLUGIN_ROOT,
    process.env.CLAUDE_PLUGIN_ROOT && path.basename(process.env.CLAUDE_PLUGIN_ROOT) === "claude-mem"
      ? process.env.CLAUDE_PLUGIN_ROOT
      : undefined,
  ];
  const explicit = unique(explicitRoots.map((root) => (root ? path.resolve(root) : undefined)));
  if (explicit.length > 0) return explicit;

  const roots = [
    path.join(claudeDir, "plugins", "marketplaces", "thedotmack", "plugin"),
    path.join(claudeDir, "plugins", "marketplaces", "thedotmack", "claude-mem"),
    path.join(claudeDir, "plugins", "marketplaces", "firehorse", "claude-mem"),
    path.join(claudeDir, "plugins", "cache"),
    path.join(claudeDir, "plugins", "marketplaces"),
  ];

  return unique(roots.map((root) => path.resolve(root)));
}

function shouldScanFile(filePath) {
  const name = path.basename(filePath);
  return /^(worker-service|context-generator|mcp-server|server-beta-service)\.c?js$/.test(name);
}

function collectTargets(root, depth = 0, acc = []) {
  if (!root || depth > 7 || !fs.existsSync(root)) return acc;

  const stat = fs.statSync(root);
  if (stat.isFile()) {
    if (shouldScanFile(root)) acc.push(root);
    return acc;
  }

  if (!stat.isDirectory()) return acc;

  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isFile() && shouldScanFile(fullPath)) {
      acc.push(fullPath);
    } else if (entry.isDirectory()) {
      collectTargets(fullPath, depth + 1, acc);
    }
  }

  return acc;
}

const targets = unique(candidateRoots().flatMap((root) => collectTargets(root)));

if (targets.length === 0) {
  if (VERBOSE) console.log("claude-mem scripts not found; install claude-mem first.");
  process.exit(CHECK_ONLY ? 1 : 0);
}

let patched = 0;
let alreadyPatched = 0;
let signatureChanged = 0;

for (const target of targets) {
  const content = fs.readFileSync(target, "utf8");
  if (content.includes("FIREHORSE_PROJECT_NAME") && content.includes("CLAUDE_MEM_PROJECT")) {
    alreadyPatched += 1;
    if (VERBOSE) console.log(`SKIP already patched: ${target}`);
    continue;
  }

  let replacements = 0;
  const updated = content.replace(CONTEXT_RE, (...args) => {
    replacements += 1;
    return replacement(...args);
  });

  if (replacements === 0) {
    if (content.includes("parentProjectName") || content.includes("PROJECT_NAME")) {
      signatureChanged += 1;
      if (VERBOSE) console.log(`WARNING signature changed; not patched: ${target}`);
    }
    continue;
  }

  if (CHECK_ONLY) {
    signatureChanged += 1;
    continue;
  }

  fs.writeFileSync(target, updated);
  patched += 1;
  console.log(`PATCHED ${target}`);
}

if (CHECK_ONLY) {
  if (signatureChanged > 0 || (patched === 0 && alreadyPatched === 0)) process.exit(1);
  process.exit(0);
}

console.log(
  `Done: ${patched} patched, ${alreadyPatched} already patched, ${signatureChanged} signature changed, ${targets.length} candidates`,
);
if (patched > 0) {
  console.log("Restart Claude Code or the claude-mem worker for the patch to take effect.");
}
