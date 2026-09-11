/**
 * Filesystem edge for the upstream drift check: reads the declared dependencies,
 * the recorded baseline, and whatever is installed under `~/.claude/plugins/`.
 * All diffing and impact logic lives in `firehorse-core/src/upstreams/`.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

import {
  UPSTREAMS_LOCK_PATH,
  UPSTREAMS_LOCK_SCHEMA_VERSION,
  hashUpstreamSkillSource,
  installedUpstreamSkillKeys,
  lockedUpstreamSkillKeys,
  parseUpstreamsLockfile,
  type DeclaredUpstreamPlugin,
  type InstalledUpstreamPlugin,
  type InstalledUpstreamSkill,
  type UpstreamsLockfile,
} from "../../packages/firehorse-core/src/upstreams/index.js";

const PLUGIN_MANIFEST = "packages/firehorse-claude/.claude-plugin/plugin.json";
const MARKETPLACE_MANIFEST = ".claude-plugin/marketplace.json";
const SKILL_FILE = "SKILL.md";
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git", "dist", ".out-of-scope"]);

/** Whether `candidate` resolves to `parent` itself or something beneath it. */
function isInside(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** `~/.claude/plugins/`, overridable so a test can point the check at a copy. */
export function resolveClaudePluginsDir(): string {
  return process.env.FIREHORSE_CLAUDE_PLUGINS_DIR ?? path.join(homedir(), ".claude", "plugins");
}

interface DependencyEntry {
  readonly name?: string;
  readonly marketplace?: string;
}

/**
 * Plugins enter the lockfile because they are declared, not because they happen
 * to be installed. Both manifests declare the same dependencies; read the union.
 */
export async function readDeclaredUpstreamPlugins(
  repoRoot: string,
): Promise<readonly DeclaredUpstreamPlugin[]> {
  const declared = new Map<string, DeclaredUpstreamPlugin>();

  const pluginManifest = await readJsonIfExists<{
    dependencies?: readonly DependencyEntry[];
  }>(path.join(repoRoot, PLUGIN_MANIFEST));
  const marketplaceManifest = await readJsonIfExists<{
    plugins?: readonly { dependencies?: readonly DependencyEntry[] }[];
  }>(path.join(repoRoot, MARKETPLACE_MANIFEST));

  const entries = [
    ...(pluginManifest?.dependencies ?? []),
    ...(marketplaceManifest?.plugins ?? []).flatMap((plugin) => plugin.dependencies ?? []),
  ];

  for (const entry of entries) {
    if (!entry.name || !entry.marketplace) {
      continue;
    }
    declared.set(`${entry.name}@${entry.marketplace}`, {
      name: entry.name,
      marketplace: entry.marketplace,
    });
  }

  return [...declared.values()].sort((a, b) => (a.name < b.name ? -1 : 1));
}

export async function readUpstreamsLockfile(repoRoot: string): Promise<UpstreamsLockfile | null> {
  const content = await readFileIfExists(path.join(repoRoot, UPSTREAMS_LOCK_PATH));
  return content === null ? null : parseUpstreamsLockfile(content);
}

export function emptyUpstreamsLockfile(): UpstreamsLockfile {
  return { schemaVersion: UPSTREAMS_LOCK_SCHEMA_VERSION, plugins: {} };
}

interface InstalledRecord {
  readonly installPath?: string;
  readonly version?: string;
}

/**
 * Read the declared plugins as installed on disk, or `null` when the plugins
 * directory does not exist — on CI it does not, and absence is not drift.
 */
export async function readInstalledUpstreamPlugins(options: {
  readonly pluginsDir: string;
  readonly declared: readonly DeclaredUpstreamPlugin[];
}): Promise<readonly InstalledUpstreamPlugin[] | null> {
  if (!(await exists(options.pluginsDir))) {
    return null;
  }

  const registry = await readJsonIfExists<{
    plugins?: Record<string, readonly InstalledRecord[]>;
  }>(path.join(options.pluginsDir, "installed_plugins.json"));

  const installed: InstalledUpstreamPlugin[] = [];
  for (const declared of options.declared) {
    const root = await resolveInstallPath({
      pluginsDir: options.pluginsDir,
      declared,
      registry: registry?.plugins?.[`${declared.name}@${declared.marketplace}`],
    });
    if (!root) {
      continue;
    }
    installed.push({
      name: declared.name,
      marketplace: declared.marketplace,
      version: root.version,
      skills: await readPluginSkills(root.path),
    });
  }

  return installed;
}

export interface UpstreamsState {
  readonly pluginsDir: string;
  readonly declared: readonly DeclaredUpstreamPlugin[];
  readonly lockfile: UpstreamsLockfile;
  readonly lockfilePresent: boolean;
  /** `null` when the plugins directory does not exist. */
  readonly installed: readonly InstalledUpstreamPlugin[] | null;
}

/** Everything the drift check compares, read once from disk. */
export async function readUpstreamsState(repoRoot: string): Promise<UpstreamsState> {
  const pluginsDir = resolveClaudePluginsDir();
  const declared = await readDeclaredUpstreamPlugins(repoRoot);
  const lockfile = await readUpstreamsLockfile(repoRoot);
  return {
    pluginsDir,
    declared,
    lockfile: lockfile ?? emptyUpstreamsLockfile(),
    lockfilePresent: lockfile !== null,
    installed: await readInstalledUpstreamPlugins({ pluginsDir, declared }),
  };
}

/**
 * Keys an `upstreamSkills` entry may resolve to, plus a label naming what was
 * actually read — on-disk truth when the plugins directory exists, the recorded
 * baseline alone when it does not.
 */
export function resolveKnownUpstreamSkills(state: UpstreamsState): {
  readonly known: ReadonlySet<string>;
  readonly source: string;
} {
  if (state.installed === null) {
    return {
      known: lockedUpstreamSkillKeys(state.lockfile),
      source: `${UPSTREAMS_LOCK_PATH} (${state.pluginsDir} does not exist)`,
    };
  }
  return {
    known: installedUpstreamSkillKeys(state.installed),
    source: `the plugins installed under ${state.pluginsDir}`,
  };
}

async function resolveInstallPath(options: {
  readonly pluginsDir: string;
  readonly declared: DeclaredUpstreamPlugin;
  readonly registry: readonly InstalledRecord[] | undefined;
}): Promise<{ path: string; version: string } | null> {
  for (const record of options.registry ?? []) {
    // A registry entry records an absolute path. Honour it only when it sits
    // inside the plugins directory being read: otherwise pointing the check at
    // a copy would silently read the real tree while reporting the copy.
    if (
      record.installPath &&
      isInside(options.pluginsDir, record.installPath) &&
      (await exists(record.installPath))
    ) {
      return {
        path: record.installPath,
        version: record.version ?? (await readManifestVersion(record.installPath)),
      };
    }
  }

  // No registry entry (or a stale one): fall back to the cache layout,
  // `cache/<marketplace>/<plugin>/<version>/`.
  const cacheDir = path.join(
    options.pluginsDir,
    "cache",
    options.declared.marketplace,
    options.declared.name,
  );
  if (!(await exists(cacheDir))) {
    return null;
  }
  const versions = (await readdir(cacheDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => (a < b ? 1 : -1));
  if (versions.length === 0) {
    return null;
  }
  const root = path.join(cacheDir, versions[0]);
  return { path: root, version: await readManifestVersion(root) };
}

async function readManifestVersion(root: string): Promise<string> {
  const manifest = await readJsonIfExists<{ version?: string }>(
    path.join(root, ".claude-plugin", "plugin.json"),
  );
  return manifest?.version ?? path.basename(root);
}

/**
 * A plugin's exposed skills. The manifest's `skills` field is the authority on
 * what a session can invoke: an array of skill directories, or a single
 * directory to scan. A plugin without the field is scanned under `skills/`.
 */
async function readPluginSkills(root: string): Promise<readonly InstalledUpstreamSkill[]> {
  const manifest = await readJsonIfExists<{
    skills?: readonly string[] | string;
  }>(path.join(root, ".claude-plugin", "plugin.json"));
  const declared = manifest?.skills;

  const files = Array.isArray(declared)
    ? declared.map((entry) => path.join(root, entry.replace(/^\.\//, ""), SKILL_FILE))
    : await listSkillFiles(path.join(root, typeof declared === "string" ? declared : "skills"));

  const skills: InstalledUpstreamSkill[] = [];
  for (const file of files) {
    const content = await readFileIfExists(file);
    if (content === null) {
      // A manifest entry whose SKILL.md is gone reads as a vanished skill.
      continue;
    }
    const frontmatterName = readFrontmatterName(content);
    skills.push({
      key: frontmatterName ?? path.basename(path.dirname(file)),
      path: path.relative(root, file).replaceAll("\\", "/"),
      sha256: hashUpstreamSkillSource(content),
      nameSource: frontmatterName ? "frontmatter" : "directory",
    });
  }
  return skills;
}

async function listSkillFiles(root: string): Promise<string[]> {
  if (!(await exists(root))) {
    return [];
  }
  const entries = await readdir(root, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return SKIPPED_DIRECTORIES.has(entry.name) ? [] : listSkillFiles(full);
      }
      return entry.isFile() && entry.name === SKILL_FILE ? [full] : [];
    }),
  );
  return found.flat().sort((a, b) => (a < b ? -1 : 1));
}

/** The frontmatter `name`, which is what an `upstreamSkills` entry references. */
export function readFrontmatterName(content: string): string | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!match) {
    return null;
  }
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^name:\s*(.+?)\s*$/.exec(line);
    if (field) {
      return field[1].replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  const content = await readFileIfExists(filePath);
  return content === null ? null : (JSON.parse(content) as T);
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    ((error as NodeJS.ErrnoException).code === "ENOENT" ||
      (error as NodeJS.ErrnoException).code === "ENOTDIR")
  );
}
