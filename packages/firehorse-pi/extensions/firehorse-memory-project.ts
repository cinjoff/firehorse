import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";

const MANIFEST_RELATIVE_PATH = ".firehorse/manifest.json";
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

interface ManifestProjectResult {
  projectName: string;
  source: string;
}

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function shouldSkip(): boolean {
  return isTruthy(process.env.FIREHORSE_SKIP_MEMORY_PROJECT);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringAt(value: Record<string, unknown>, path: readonly string[]): string | undefined {
  let current: unknown = value;
  for (const part of path) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return typeof current === "string" && current.trim() ? current.trim() : undefined;
}

function findManifest(start: string): string | undefined {
  let current = resolve(start);
  const root = parse(current).root;

  while (true) {
    const manifestPath = join(current, MANIFEST_RELATIVE_PATH);
    if (existsSync(manifestPath)) return manifestPath;
    if (current === root) return undefined;
    current = dirname(current);
  }
}

function fromSetupManifest(cwd: string): ManifestProjectResult | undefined {
  const manifestPath = findManifest(cwd);
  if (!manifestPath) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) return undefined;

  const explicitMemoryProject = stringAt(parsed, ["memory", "project"]);
  if (explicitMemoryProject) {
    return {
      projectName: explicitMemoryProject,
      source: `${MANIFEST_RELATIVE_PATH}:memory.project`,
    };
  }

  const githubRepo = stringAt(parsed, ["github", "repo"]);
  if (githubRepo) {
    return { projectName: githubRepo, source: `${MANIFEST_RELATIVE_PATH}:github.repo` };
  }

  const projectName = stringAt(parsed, ["project", "name"]);
  if (projectName) {
    return { projectName, source: `${MANIFEST_RELATIVE_PATH}:project.name` };
  }

  return undefined;
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

function fromExplicitEnv(): { projectName: string; source: string } | undefined {
  const firehorseProject = process.env.FIREHORSE_PROJECT_NAME?.trim();
  if (firehorseProject) return { projectName: firehorseProject, source: "FIREHORSE_PROJECT_NAME" };

  const claudeMem = process.env.CLAUDE_MEM_PROJECT?.trim();
  if (claudeMem) return { projectName: claudeMem, source: "CLAUDE_MEM_PROJECT" };

  const piMem = process.env.PI_MEM_PROJECT?.trim();
  if (piMem) return { projectName: piMem, source: "PI_MEM_PROJECT" };

  return undefined;
}

function canonicalProjectName(cwd: string): { projectName: string; source: string } | undefined {
  return fromSetupManifest(cwd) ?? fromGitHubRemote(cwd) ?? fromExplicitEnv();
}

function applyMemoryProject(cwd = process.cwd()): ApplyResult | undefined {
  if (shouldSkip()) return undefined;

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
// see PI_MEM_PROJECT before their session_start handlers run. This writes only
// process-local environment variables, never user-global config.
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
