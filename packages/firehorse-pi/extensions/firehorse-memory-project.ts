import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, parse, resolve, sep } from "node:path";

const DEFAULT_MEMORY_ENV_FILE = join(homedir(), ".config", "firehorse", "memory.env");
const PROJECT_ENV_KEYS = ["FIREHORSE_PROJECT_NAME", "CLAUDE_MEM_PROJECT", "PI_MEM_PROJECT"];

type NotifyType = "info" | "success" | "warning" | "error";

interface ExtensionAPI {
  on(
    event: "session_start",
    handler: (
      event: { reason?: string },
      ctx: { cwd?: string; ui?: { notify(message: string, type?: NotifyType): void } },
    ) => void | Promise<void>,
  ): void;
}

interface ApplyResult {
  projectName: string;
  changed: boolean;
  source: string;
}

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function shouldSkip(): boolean {
  return isTruthy(process.env.FIREHORSE_SKIP_MEMORY_PROJECT);
}

function memoryEnvFile(): string {
  return process.env.FIREHORSE_MEMORY_ENV_FILE || DEFAULT_MEMORY_ENV_FILE;
}

function isSecureEnvFile(path: string): boolean {
  if (platform() === "win32") return true;

  const mode = statSync(path).mode & 0o777;
  return (mode & 0o077) === 0;
}

function parseEnvLine(line: string): [string, string] | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;

  const index = trimmed.indexOf("=");
  if (index <= 0) return undefined;

  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function loadMemoryEnv(): void {
  const path = memoryEnvFile();
  if (!existsSync(path) || !isSecureEnvFile(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;

    const [key, value] = entry;
    if (!PROJECT_ENV_KEYS.includes(key) || process.env[key]) continue;
    process.env[key] = value;
  }
}

function splitPath(path: string): string[] {
  return resolve(path).split(sep).filter(Boolean);
}

function fromSupersetPath(cwd: string): string | undefined {
  const parts = splitPath(cwd);
  const index = parts.findIndex((part, i) => part === ".superset" && parts[i + 1] === "worktrees");
  const project = index >= 0 ? parts[index + 2] : undefined;
  return project && project.trim() ? project : undefined;
}

function findGitMarker(start: string): string | undefined {
  let current = resolve(start);
  const root = parse(current).root;

  while (true) {
    const marker = join(current, ".git");
    if (existsSync(marker)) return marker;
    if (current === root) return undefined;
    current = dirname(current);
  }
}

function gitDirFromMarker(marker: string): string | undefined {
  const stats = statSync(marker);
  if (stats.isDirectory()) return marker;
  if (!stats.isFile()) return undefined;

  const content = readFileSync(marker, "utf8").trim();
  const match = content.match(/^gitdir:\s*(.+)$/);
  const gitDir = match?.[1]?.trim();
  if (!gitDir) return undefined;

  return resolve(dirname(marker), gitDir);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function gitConfigCandidates(marker: string): string[] {
  const gitDir = gitDirFromMarker(marker);
  if (!gitDir) return [];

  const candidates = [join(gitDir, "config")];
  const commonDirFile = join(gitDir, "commondir");
  if (existsSync(commonDirFile)) {
    const commonDir = readFileSync(commonDirFile, "utf8").trim();
    if (commonDir) candidates.push(join(resolve(gitDir, commonDir), "config"));
  }

  const worktreeMatch = gitDir.match(/^(.+[/\\]\.git)[/\\]worktrees[/\\][^/\\]+$/);
  if (worktreeMatch?.[1]) candidates.push(join(worktreeMatch[1], "config"));

  return unique(candidates.filter((candidate) => existsSync(candidate)));
}

function parseGitConfigRemoteUrls(config: string): Array<{ name: string; url: string }> {
  const urls: Array<{ name: string; url: string }> = [];
  let remoteName: string | undefined;

  for (const rawLine of config.split(/\r?\n/)) {
    const line = rawLine.trim();
    const section = line.match(/^\[remote\s+"(.+)"\]$/);
    if (section) {
      remoteName = section[1];
      continue;
    }
    if (line.startsWith("[") && !section) {
      remoteName = undefined;
      continue;
    }

    const url = line.match(/^url\s*=\s*(.+)$/);
    if (remoteName && url?.[1]) urls.push({ name: remoteName, url: url[1].trim() });
  }

  return urls;
}

function parseGitHubRepoName(url: string): string | undefined {
  const normalized = url.trim().replace(/^git\+/, "");
  const patterns = [
    /^git@github\.com:([^/]+)\/([^/#?]+)$/,
    /^ssh:\/\/git@github\.com[:/]([^/]+)\/([^/#?]+)$/,
    /^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)$/,
    /^github\.com\/([^/]+)\/([^/#?]+)$/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const repo = match?.[2]?.replace(/\.git$/, "").trim();
    if (repo) return repo;
  }

  return undefined;
}

function fromGitHubRemote(cwd: string): { projectName: string; source: string } | undefined {
  const marker = findGitMarker(cwd);
  if (!marker) return undefined;

  const remotes = gitConfigCandidates(marker).flatMap((candidate) =>
    parseGitConfigRemoteUrls(readFileSync(candidate, "utf8")),
  );
  const selected =
    remotes.find((remote) => remote.name === "origin" && parseGitHubRepoName(remote.url)) ??
    remotes.find((remote) => remote.name === "upstream" && parseGitHubRepoName(remote.url)) ??
    remotes.find((remote) => parseGitHubRepoName(remote.url));
  if (!selected) return undefined;

  const projectName = parseGitHubRepoName(selected.url);
  return projectName ? { projectName, source: `github-remote:${selected.name}` } : undefined;
}

function canonicalProjectName(cwd: string): { projectName: string; source: string } | undefined {
  const explicit = process.env.FIREHORSE_PROJECT_NAME?.trim();
  if (explicit) return { projectName: explicit, source: "FIREHORSE_PROJECT_NAME" };

  const claudeMem = process.env.CLAUDE_MEM_PROJECT?.trim();
  if (claudeMem) return { projectName: claudeMem, source: "CLAUDE_MEM_PROJECT" };

  const piMem = process.env.PI_MEM_PROJECT?.trim();
  if (piMem) return { projectName: piMem, source: "PI_MEM_PROJECT" };

  const githubProject = fromGitHubRemote(cwd);
  if (githubProject) return githubProject;

  const supersetProject = fromSupersetPath(cwd);
  if (supersetProject)
    return { projectName: supersetProject, source: "inferred-superset-worktree-path" };

  // Do not infer from git parent/common-dir or cwd basename here. Conductor and
  // Superset worktrees can be stored outside the canonical repository root, so
  // setup should pass/persist the project id explicitly for all non-Superset
  // layouts.
  return undefined;
}

function applyMemoryProject(cwd = process.cwd()): ApplyResult | undefined {
  if (shouldSkip()) return undefined;

  loadMemoryEnv();
  const canonical = canonicalProjectName(cwd);
  if (!canonical) return undefined;

  const { projectName, source } = canonical;

  let changed = false;
  for (const key of PROJECT_ENV_KEYS) {
    if (process.env[key] === projectName) continue;
    process.env[key] = projectName;
    changed = true;
  }

  return { projectName, source, changed };
}

// Apply once during module loading so later extensions such as pi-agent-memory
// see PI_MEM_PROJECT before their session_start handlers run.
applyMemoryProject();

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (event, ctx) => {
    if (event.reason === "reload") return;

    try {
      const result = applyMemoryProject(ctx.cwd ?? process.cwd());
      if (result?.changed && isTruthy(process.env.FIREHORSE_NOTIFY_MEMORY_PROJECT)) {
        ctx.ui?.notify(
          `Firehorse pinned memory project to ${result.projectName} (${result.source}).`,
          "info",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui?.notify(`Firehorse could not pin memory project: ${message}`, "warning");
    }
  });
}
