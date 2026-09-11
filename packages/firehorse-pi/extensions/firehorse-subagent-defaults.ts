import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type NotifyType = "info" | "success" | "warning" | "error";

interface ExtensionAPI {
  on(
    event: "session_start",
    handler: (
      event: { reason?: string },
      ctx: { ui?: { notify(message: string, type?: NotifyType): void } },
    ) => void | Promise<void>,
  ): void;
}

interface SubagentDefaultsManifest {
  schemaVersion: number;
  agentOverrides?: Record<string, { skills?: string[]; tools?: string[] }>;
}

interface SettingsShape {
  subagents?: {
    agentOverrides?: Record<string, Record<string, unknown>>;
    firehorseDefaultsVersion?: number;
  };
  [key: string]: unknown;
}

interface GeneratedAgentSource {
  readonly fileName: string;
  readonly content: string;
}

interface AgentRoleSyncResult {
  readonly created: string[];
  readonly updated: string[];
  readonly removed: string[];
  readonly conflicts: string[];
}

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEFAULTS_PATH = join(PACKAGE_ROOT, "firehorse.subagents.json");
const GENERATED_AGENTS_DIR = join(PACKAGE_ROOT, "agents");
const RETIRED_AGENT_TARGETS = new Set([
  "firehorse/reviewer.md",
  "firehorse/plan-reviewer.md",
  "horse-code-reviewer.md",
  "horse-diagnostic-reviewer.md",
  "horse-plan-reviewer.md",
]);

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function shouldSkipSubagentDefaults(): boolean {
  return (
    isTruthy(process.env.FIREHORSE_SKIP_SUBAGENT_DEFAULTS) ||
    isTruthy(process.env.FIREHORSE_DISABLE_SUBAGENT_DEFAULTS) ||
    isTruthy(process.env.CI)
  );
}

function shouldSkipAgentSync(): boolean {
  return (
    isTruthy(process.env.FIREHORSE_SKIP_AGENT_SYNC) ||
    isTruthy(process.env.FIREHORSE_DISABLE_AGENT_SYNC) ||
    isTruthy(process.env.CI)
  );
}

function agentDir(): string {
  return process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
}

function settingsPath(): string {
  return join(agentDir(), "settings.json");
}

function agentRolesDir(): string {
  return join(agentDir(), "agents");
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function tryReadJson<T>(path: string): T | undefined {
  try {
    return readJson<T>(path);
  } catch {
    return undefined;
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function defaultedStrings(
  existing: unknown,
  defaults: string[],
  manageExisting: boolean,
): string[] | undefined {
  if (existing === false) return undefined;
  if (existing === undefined) return [...defaults];

  const existingStrings = stringArray(existing);
  if (!existingStrings) return undefined;

  const missingDefaults = defaults.filter((item) => !existingStrings.includes(item));
  if (missingDefaults.length === 0) return existingStrings;

  // Respect user-authored allowlists. Firehorse only upgrades existing
  // allowlists after it has already applied defaults once before.
  if (!manageExisting) return undefined;

  return [...existingStrings, ...missingDefaults];
}

function applySubagentDefaults(): boolean {
  if (shouldSkipSubagentDefaults()) return false;

  const defaults = tryReadJson<SubagentDefaultsManifest>(DEFAULTS_PATH);
  if (!defaults?.agentOverrides || defaults.schemaVersion < 1) return false;

  const path = settingsPath();
  const settings = tryReadJson<SettingsShape>(path) ?? {};
  const subagents =
    settings.subagents &&
    typeof settings.subagents === "object" &&
    !Array.isArray(settings.subagents)
      ? settings.subagents
      : {};
  const agentOverrides =
    subagents.agentOverrides &&
    typeof subagents.agentOverrides === "object" &&
    !Array.isArray(subagents.agentOverrides)
      ? subagents.agentOverrides
      : {};

  const manageExisting = subagents.firehorseDefaultsVersion !== undefined;
  let changed = false;

  for (const [agentName, override] of Object.entries(defaults.agentOverrides)) {
    if (!override.skills?.length && !override.tools?.length) continue;

    const current =
      agentOverrides[agentName] &&
      typeof agentOverrides[agentName] === "object" &&
      !Array.isArray(agentOverrides[agentName])
        ? agentOverrides[agentName]
        : {};
    const next = { ...current };
    let agentChanged = false;

    if (override.tools?.length) {
      const tools = defaultedStrings(current.tools, override.tools, manageExisting);
      if (tools && JSON.stringify(current.tools) !== JSON.stringify(tools)) {
        next.tools = tools;
        agentChanged = true;
      }
    }

    if (override.skills?.length) {
      const skills = defaultedStrings(current.skills, override.skills, manageExisting);
      if (skills && JSON.stringify(current.skills) !== JSON.stringify(skills)) {
        next.skills = skills;
        agentChanged = true;
      }
    }

    if (agentChanged) {
      agentOverrides[agentName] = next;
      changed = true;
    }
  }

  if (!changed) return false;

  settings.subagents = {
    ...subagents,
    agentOverrides,
    firehorseDefaultsVersion: defaults.schemaVersion,
  };
  writeJson(path, settings);
  return true;
}

function frontmatterValue(content: string, key: string): string | undefined {
  const frontmatter = content.match(/^---\n(?<frontmatter>[\s\S]*?)\n---\n?/u)?.groups?.frontmatter;
  if (!frontmatter) return undefined;

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const rawValue = frontmatter.match(new RegExp(`^${escapedKey}:\\s*(.+)$`, "mu"))?.[1];
  if (!rawValue) return undefined;

  const trimmed = rawValue.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function isFirehorseAgentRole(content: string): boolean {
  return (
    frontmatterValue(content, "firehorseGenerated") === "true" &&
    frontmatterValue(content, "firehorseKind") === "agent-role" &&
    Boolean(frontmatterValue(content, "firehorseSourceSha256"))
  );
}

function generatedAgentSources(): GeneratedAgentSource[] {
  if (!existsSync(GENERATED_AGENTS_DIR)) return [];

  return readdirSync(GENERATED_AGENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => {
      const content = readFileSync(join(GENERATED_AGENTS_DIR, entry.name), "utf8");
      return { fileName: entry.name, content };
    })
    .filter((source) => isFirehorseAgentRole(source.content));
}

function targetMarkdownFiles(dir: string, prefix = ""): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) return targetMarkdownFiles(absolutePath, relativePath);
    if (entry.isFile() && entry.name.endsWith(".md")) return [relativePath];
    return [];
  });
}

function shouldRemoveStaleAgentTarget(relativePath: string, content: string): boolean {
  if (!isFirehorseAgentRole(content)) return false;
  if (RETIRED_AGENT_TARGETS.has(relativePath)) return true;

  const source = frontmatterValue(content, "firehorseSource");
  return source?.startsWith("packages/firehorse-core/definitions/agents/") === true;
}

function syncGeneratedAgentRoles(): AgentRoleSyncResult {
  const result: AgentRoleSyncResult = {
    created: [],
    updated: [],
    removed: [],
    conflicts: [],
  };

  if (shouldSkipAgentSync()) return result;

  const sources = generatedAgentSources();
  if (sources.length === 0) return result;

  const targetDir = agentRolesDir();
  mkdirSync(targetDir, { recursive: true });

  for (const source of sources) {
    const targetPath = join(targetDir, source.fileName);
    if (!existsSync(targetPath)) {
      writeFileSync(targetPath, source.content);
      result.created.push(source.fileName);
      continue;
    }

    const current = readFileSync(targetPath, "utf8");
    if (current === source.content) continue;

    if (!isFirehorseAgentRole(current)) {
      result.conflicts.push(targetPath);
      continue;
    }

    writeFileSync(targetPath, source.content);
    result.updated.push(source.fileName);
  }

  const expectedTargets = new Set(sources.map((source) => source.fileName));
  for (const relativePath of targetMarkdownFiles(targetDir)) {
    if (expectedTargets.has(relativePath)) continue;

    const absolutePath = join(targetDir, relativePath);
    const current = readFileSync(absolutePath, "utf8");
    if (!shouldRemoveStaleAgentTarget(relativePath, current)) continue;

    rmSync(absolutePath);
    result.removed.push(relativePath);
  }

  return result;
}

function syncSummary(result: AgentRoleSyncResult): string | undefined {
  const parts = [
    result.created.length ? `${result.created.length} created` : undefined,
    result.updated.length ? `${result.updated.length} updated` : undefined,
    result.removed.length ? `${result.removed.length} retired` : undefined,
  ].filter((part): part is string => Boolean(part));

  if (parts.length === 0) return undefined;
  return parts.join(", ");
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (event, ctx) => {
    if (event.reason === "reload") return;

    try {
      const defaultsChanged = applySubagentDefaults();
      const agentSync = syncGeneratedAgentRoles();
      const agentSyncSummary = syncSummary(agentSync);

      if (defaultsChanged) {
        ctx.ui?.notify(
          "Firehorse enabled bundled tools and skills for built-in pi-subagents. Set FIREHORSE_SKIP_SUBAGENT_DEFAULTS=1 to opt out.",
          "info",
        );
      }

      if (agentSyncSummary) {
        ctx.ui?.notify(
          `Firehorse synced generated Pi subagent roles (${agentSyncSummary}). Set FIREHORSE_SKIP_AGENT_SYNC=1 to opt out.`,
          "info",
        );
      }

      if (agentSync.conflicts.length > 0) {
        ctx.ui?.notify(
          `Firehorse found ${agentSync.conflicts.length} hand-authored Pi subagent role conflict(s); run /skill:firehorse-setup --check for details.`,
          "warning",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui?.notify(
        `Firehorse could not apply subagent defaults or sync agent roles: ${message}`,
        "warning",
      );
    }
  });
}
