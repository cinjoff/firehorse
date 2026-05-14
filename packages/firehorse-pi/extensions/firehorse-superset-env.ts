import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const DEFAULT_SUPERSET_ENV_FILE = join(homedir(), ".config", "firehorse", "superset.env");
const ALLOWED_KEYS = new Set(["SUPERSET_API_KEY", "SUPERSET_ORGANIZATION_ID"]);

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

interface LoadResult {
  loaded: boolean;
  insecurePath?: string;
}

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function shouldSkip(): boolean {
  return isTruthy(process.env.FIREHORSE_SKIP_SUPERSET_ENV);
}

function supersetEnvFile(): string {
  return process.env.FIREHORSE_SUPERSET_ENV_FILE || DEFAULT_SUPERSET_ENV_FILE;
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

  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) return undefined;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function loadSupersetEnv(): LoadResult {
  if (shouldSkip()) return { loaded: false };

  const path = supersetEnvFile();
  if (!existsSync(path)) return { loaded: false };

  if (!isSecureEnvFile(path)) {
    return { loaded: false, insecurePath: path };
  }

  let loaded = false;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;

    const [key, value] = entry;
    if (!ALLOWED_KEYS.has(key) || process.env[key]) continue;

    process.env[key] = value;
    loaded = true;
  }

  return { loaded };
}

// Non-mutating support for /skill:firehorse-setup. The setup skill writes MCP
// config once; this loader only makes a private user-scoped API key available to
// pi-mcp-adapter when Pi was launched outside a shell profile.
loadSupersetEnv();

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    const result = loadSupersetEnv();
    if (!result.insecurePath) return;

    ctx.ui?.notify(
      `Firehorse ignored ${result.insecurePath} because it is group/world-readable. Run chmod 600 on it before storing SUPERSET_API_KEY there.`,
      "warning",
    );
  });
}
