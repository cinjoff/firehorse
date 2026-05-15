import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEFAULTS_PATH = join(PACKAGE_ROOT, "firehorse.subagents.json");

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function shouldSkip(): boolean {
  return (
    isTruthy(process.env.FIREHORSE_SKIP_SUBAGENT_DEFAULTS) ||
    isTruthy(process.env.FIREHORSE_DISABLE_SUBAGENT_DEFAULTS) ||
    isTruthy(process.env.CI)
  );
}

function agentDir(): string {
  return process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
}

function settingsPath(): string {
  return join(agentDir(), "settings.json");
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
  if (shouldSkip()) return false;

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

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (event, ctx) => {
    if (event.reason === "reload") return;

    try {
      const changed = applySubagentDefaults();
      if (changed) {
        ctx.ui?.notify(
          "Firehorse enabled bundled tools and skills for built-in pi-subagents. Set FIREHORSE_SKIP_SUBAGENT_DEFAULTS=1 to opt out.",
          "info",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui?.notify(`Firehorse could not apply subagent defaults: ${message}`, "warning");
    }
  });
}
