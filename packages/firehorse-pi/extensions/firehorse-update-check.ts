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
      ctx: { ui: { notify(message: string, type?: NotifyType): void } },
    ) => void | Promise<void>,
  ): void;
}

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CHECK_INTERVAL_MS = Number(
  process.env.FIREHORSE_UPDATE_CHECK_INTERVAL_MS ?? 24 * 60 * 60 * 1000,
);
const REQUEST_TIMEOUT_MS = Number(process.env.FIREHORSE_UPDATE_CHECK_TIMEOUT_MS ?? 2500);
const NPM_LATEST_URL = "https://registry.npmjs.org/firehorse-pi/latest";
const GITHUB_RELEASES_URL = "https://github.com/cinjoff/firehorse/releases";
const GITHUB_RELEASE_BY_TAG_URL = "https://api.github.com/repos/cinjoff/firehorse/releases/tags/";

interface LatestInfo {
  version: string;
  releaseUrl?: string;
  releaseName?: string;
}

interface CacheShape {
  checkedAt?: number;
  latest?: LatestInfo;
  lastNotifiedAt?: number;
  lastNotifiedVersion?: string;
}

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function shouldSkip(): boolean {
  return (
    isTruthy(process.env.FIREHORSE_SKIP_UPDATE_CHECK) ||
    isTruthy(process.env.FIREHORSE_OFFLINE) ||
    isTruthy(process.env.PI_OFFLINE) ||
    isTruthy(process.env.CI)
  );
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

function parseVersion(version: string) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? "",
  };
}

function compareVersions(a: string, b: string): number {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);
  if (!parsedA || !parsedB) return 0;

  for (const key of ["major", "minor", "patch"] as const) {
    if (parsedA[key] !== parsedB[key]) return parsedA[key] > parsedB[key] ? 1 : -1;
  }

  if (parsedA.prerelease === parsedB.prerelease) return 0;
  if (!parsedA.prerelease) return 1;
  if (!parsedB.prerelease) return -1;
  return parsedA.prerelease > parsedB.prerelease ? 1 : -1;
}

async function fetchJson<T>(url: string): Promise<T | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "firehorse-update-check",
      },
    });
    if (!response.ok) return undefined;
    return (await response.json()) as T;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLatest(): Promise<LatestInfo | undefined> {
  const npmInfo = await fetchJson<{ version?: string }>(NPM_LATEST_URL);
  const version = npmInfo?.version;
  if (!version) return undefined;

  const release = await fetchJson<{ html_url?: string; name?: string }>(
    `${GITHUB_RELEASE_BY_TAG_URL}v${version}`,
  );

  return {
    version,
    releaseUrl: release?.html_url ?? GITHUB_RELEASES_URL,
    ...(release?.name ? { releaseName: release.name } : {}),
  };
}

function cachePath(): string {
  return join(homedir(), ".firehorse", "firehorse-pi-update-check.json");
}

function buildMessage(currentVersion: string, latest: LatestInfo): string {
  return [
    `Firehorse update available: firehorse-pi ${currentVersion} → ${latest.version}.`,
    "Includes Firehorse changes plus curated upstream skill/package updates when released.",
    "Run: pi update npm:firehorse-pi (or pi update git:github.com/cinjoff/firehorse for Git installs)",
    `Release notes: ${latest.releaseUrl ?? GITHUB_RELEASES_URL}`,
  ].join("\n");
}

async function checkForUpdate(): Promise<string | undefined> {
  if (shouldSkip()) return undefined;

  const pkg = readJson<{ version?: string }>(join(PACKAGE_ROOT, "package.json"));
  const currentVersion = pkg.version;
  if (!currentVersion) return undefined;

  const now = Date.now();
  const path = cachePath();
  const cache = tryReadJson<CacheShape>(path) ?? {};

  let latest = cache.latest;
  if (!cache.checkedAt || now - cache.checkedAt > CHECK_INTERVAL_MS || !latest) {
    latest = await fetchLatest();
    writeJson(path, { ...cache, checkedAt: now, latest });
  }

  if (!latest?.version || compareVersions(latest.version, currentVersion) <= 0) {
    return undefined;
  }

  const alreadyNotifiedRecently =
    cache.lastNotifiedVersion === latest.version &&
    now - (cache.lastNotifiedAt ?? 0) < CHECK_INTERVAL_MS;
  if (alreadyNotifiedRecently) return undefined;

  writeJson(path, {
    ...cache,
    checkedAt: cache.checkedAt ?? now,
    latest,
    lastNotifiedAt: now,
    lastNotifiedVersion: latest.version,
  });

  return buildMessage(currentVersion, latest);
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    if (event.reason === "reload") return;

    const message = await checkForUpdate();
    if (!message) return;

    ctx.ui.notify(message, "info");
  });
}
