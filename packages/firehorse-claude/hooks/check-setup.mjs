#!/usr/bin/env node
// Reports Firehorse setup state at SessionStart, in at most one line.
//
// Bounds (decided on cinjoff/firehorse#53): read .firehorse/manifest.json, run
// at most three git commands, print at most one `firehorse:` line, exit 0 on
// every path — malformed JSON, absent git, absent manifest, unknown
// schemaVersion. Silence is the healthy state.
//
// The checks are duplicated in plain JS by design: a hook must not import from
// the workspace, because it runs before anything is built.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_VERSION = 2;
const MANIFEST_RELATIVE_PATH = ".firehorse/manifest.json";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function git(root, args) {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

function gitSucceeds(root, args) {
  try {
    execFileSync("git", ["-C", root, ...args], { stdio: "ignore" });
    return true;
  } catch (error) {
    return error?.code === "ENOENT" ? undefined : false;
  }
}

/** Markers, first hit wins: .firehorse/, docs/agents/, a firehorse marketplace entry. */
function hasFirehorseMarkers(root) {
  if (existsSync(join(root, ".firehorse"))) return true;
  if (existsSync(join(root, "docs", "agents"))) return true;

  const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
  if (!existsSync(marketplacePath)) return false;

  const marketplace = readJson(marketplacePath);
  const plugins =
    isRecord(marketplace) && Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  return plugins.some(
    (plugin) =>
      plugin === "firehorse" ||
      (isRecord(plugin) && (plugin.name === "firehorse" || plugin.source === "firehorse")),
  );
}

function commitsMatch(recorded, head) {
  const shorter = Math.min(recorded.length, head.length);
  return recorded.slice(0, shorter) === head.slice(0, shorter);
}

/** The first matching case on #53's table, or undefined for silence. */
function setupLine(root) {
  const manifestPath = join(root, MANIFEST_RELATIVE_PATH);

  if (!existsSync(manifestPath)) {
    if (!hasFirehorseMarkers(root)) return undefined;
    return `no ${MANIFEST_RELATIVE_PATH} — run /new-project`;
  }

  const manifest = readJson(manifestPath);
  if (!isRecord(manifest)) return undefined;
  if (manifest.schemaVersion !== SCHEMA_VERSION) return undefined;

  const setup = isRecord(manifest.setup) ? manifest.setup : undefined;
  if (!isRecord(setup?.mattPocockSkills)) return "setup has not run — run /new-project";

  const index = isRecord(manifest.index) ? manifest.index : undefined;
  const recorded = typeof index?.commit === "string" ? index.commit.trim() : "";
  if (!recorded) return "repo has not been indexed — run /index";

  // Git command 1 of 3.
  const head = git(root, ["rev-parse", "HEAD"]);
  if (!head) return undefined;
  if (commitsMatch(recorded, head)) return undefined;

  // Git command 2 of 3.
  const isAncestor = gitSucceeds(root, ["merge-base", "--is-ancestor", recorded, head]);
  if (isAncestor === undefined) return undefined;
  if (!isAncestor) return "index was recorded on a different history line — run /index";

  // Git command 3 of 3.
  const count = git(root, ["rev-list", "--count", `${recorded}..${head}`]);
  const behind = Number.parseInt(count ?? "", 10);
  if (!Number.isFinite(behind) || behind <= 0) return undefined;

  return `index is ${behind} commit${behind === 1 ? "" : "s"} behind HEAD — run /index`;
}

try {
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const line = setupLine(root);
  if (line) process.stdout.write(`firehorse: ${line}\n`);
} catch {
  // Setup reporting stays cheap and non-blocking: every failure is silent.
}

process.exit(0);
