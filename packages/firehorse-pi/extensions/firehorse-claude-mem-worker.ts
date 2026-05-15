import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface ExtensionAPI {
  on(
    event: "session_start",
    handler: (
      event: { reason?: string },
      ctx: { ui?: { notify(message: string, type?: NotifyType): void } },
    ) => void | Promise<void>,
  ): void;
}

type NotifyType = "info" | "success" | "warning" | "error";

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BUNDLED_CLAUDE_MEM_PLUGIN_ROOT = join(PACKAGE_ROOT, "node_modules", "claude-mem", "plugin");
const DEFAULT_MEMORY_ENV_FILE = join(homedir(), ".config", "firehorse", "memory.env");
const PROJECT_ENV_KEYS = ["FIREHORSE_PROJECT_NAME", "CLAUDE_MEM_PROJECT", "PI_MEM_PROJECT"];
const HEALTH_TIMEOUT_MS = 1000;
const STARTUP_GRACE_MS = 1500;

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function shouldSkip(): boolean {
  return (
    isTruthy(process.env.FIREHORSE_SKIP_CLAUDE_MEM_WORKER) ||
    isTruthy(process.env.FIREHORSE_DISABLE_CLAUDE_MEM_WORKER) ||
    isTruthy(process.env.PI_MEM_DISABLED) ||
    isTruthy(process.env.CI)
  );
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

function alignProjectEnv(): void {
  loadMemoryEnv();

  const projectName =
    process.env.FIREHORSE_PROJECT_NAME?.trim() ||
    process.env.CLAUDE_MEM_PROJECT?.trim() ||
    process.env.PI_MEM_PROJECT?.trim();
  if (!projectName) return;

  for (const key of PROJECT_ENV_KEYS) {
    if (!process.env[key]) process.env[key] = projectName;
  }
}

function workerHost(): string {
  return process.env.CLAUDE_MEM_HOST ?? process.env.CLAUDE_MEM_WORKER_HOST ?? "127.0.0.1";
}

function workerPort(): string {
  return process.env.CLAUDE_MEM_PORT ?? process.env.CLAUDE_MEM_WORKER_PORT ?? "37777";
}

function workerHealthUrl(): string {
  return `http://${workerHost()}:${workerPort()}/health`;
}

async function isWorkerReachable(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(workerHealthUrl(), { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function bundledWorkerScripts(): { runner: string; service: string } | undefined {
  const runner = join(BUNDLED_CLAUDE_MEM_PLUGIN_ROOT, "scripts", "bun-runner.js");
  const service = join(BUNDLED_CLAUDE_MEM_PLUGIN_ROOT, "scripts", "worker-service.cjs");

  if (!existsSync(runner) || !existsSync(service)) return undefined;
  return { runner, service };
}

function workerEnv(): NodeJS.ProcessEnv {
  alignProjectEnv();

  return {
    ...process.env,
    CLAUDE_MEM_HOST: workerHost(),
    CLAUDE_MEM_PORT: workerPort(),
    CLAUDE_MEM_WORKER_HOST: workerHost(),
    CLAUDE_MEM_WORKER_PORT: workerPort(),
  };
}

function startBundledWorker(): boolean {
  const scripts = bundledWorkerScripts();
  if (!scripts) return false;

  const child = spawn(process.execPath, [scripts.runner, scripts.service, "start"], {
    cwd: BUNDLED_CLAUDE_MEM_PLUGIN_ROOT,
    detached: true,
    env: workerEnv(),
    stdio: "ignore",
  });

  child.unref();
  return true;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Apply once during module loading so the worker inherits explicit project
// identity even if this extension loads before firehorse-memory-project.
alignProjectEnv();

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    if (event.reason === "reload" || shouldSkip()) return;

    if (await isWorkerReachable()) return;

    const started = startBundledWorker();
    if (!started) {
      ctx.ui?.notify(
        "Firehorse could not find bundled claude-mem worker scripts for pi-agent-memory. Reinstall/update firehorse-pi, or run `npx claude-mem install`.",
        "warning",
      );
      return;
    }

    await wait(STARTUP_GRACE_MS);

    if (await isWorkerReachable()) {
      ctx.ui?.notify(
        "Firehorse started the bundled claude-mem worker for pi-agent-memory.",
        "info",
      );
    } else {
      ctx.ui?.notify(
        "Firehorse attempted to start the bundled claude-mem worker but could not verify it. Run `npx claude-mem status` or `npx claude-mem repair`.",
        "warning",
      );
    }
  });
}
