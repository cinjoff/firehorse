import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_API_URL = "http://localhost:6767";
export const DEFAULT_PORT = 5187;

export interface ServerConfig {
  /** Base URL of the supermemory server, without a trailing slash. */
  readonly apiUrl: string;
  /**
   * Undefined is legitimate: #87 found the local server accepts requests with
   * no Authorization header at all. A *wrong* key is rejected with 401, so
   * sending nothing beats sending a guess.
   */
  readonly apiKey: string | undefined;
  /** Where the key came from, for the startup line and the health route. */
  readonly apiKeySource: string | undefined;
  readonly port: number;
}

interface ConfigSources {
  readonly env: Record<string, string | undefined>;
  readonly home: string;
  readonly readFile: (path: string) => string;
}

function defaultSources(): ConfigSources {
  return {
    env: process.env,
    home: homedir(),
    readFile: (path) => readFileSync(path, "utf8"),
  };
}

function readCredentialsFile(sources: ConfigSources): string | undefined {
  const path = join(sources.home, ".supermemory-claude", "credentials.json");

  try {
    const parsed: unknown = JSON.parse(sources.readFile(path));

    if (typeof parsed === "object" && parsed !== null && "apiKey" in parsed) {
      const { apiKey } = parsed as { apiKey?: unknown };
      if (typeof apiKey === "string" && apiKey.length > 0) return apiKey;
    }
  } catch {
    // No credentials file, unreadable, or not JSON. All mean "no key here".
  }

  return undefined;
}

function parsePort(raw: string | undefined): number {
  if (!raw) return DEFAULT_PORT;

  const port = Number.parseInt(raw, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`FIREHORSE_GRAPH_PORT must be a port number, got ${JSON.stringify(raw)}.`);
  }

  return port;
}

/**
 * Resolution order for the key matches the supermemory plugin's own:
 * explicit env first, then the credentials file the CLI writes.
 */
export function resolveServerConfig(overrides?: Partial<ConfigSources>): ServerConfig {
  const sources = { ...defaultSources(), ...overrides };

  const envKey = sources.env["SUPERMEMORY_API_KEY"] ?? sources.env["SUPERMEMORY_CC_API_KEY"];
  const envKeyName = sources.env["SUPERMEMORY_API_KEY"]
    ? "SUPERMEMORY_API_KEY"
    : "SUPERMEMORY_CC_API_KEY";
  const fileKey = envKey ? undefined : readCredentialsFile(sources);

  const apiKey = envKey ?? fileKey;
  const apiKeySource = envKey
    ? envKeyName
    : fileKey
      ? "~/.supermemory-claude/credentials.json"
      : undefined;

  return {
    apiUrl: (sources.env["SUPERMEMORY_API_URL"] ?? DEFAULT_API_URL).replace(/\/+$/, ""),
    apiKey,
    apiKeySource,
    port: parsePort(sources.env["FIREHORSE_GRAPH_PORT"]),
  };
}
