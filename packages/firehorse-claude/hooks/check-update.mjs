#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT =
  process.env.CLAUDE_PLUGIN_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_DATA = process.env.CLAUDE_PLUGIN_DATA ?? join(PLUGIN_ROOT, ".firehorse-data");
const CHECK_INTERVAL_MS = Number(
  process.env.FIREHORSE_UPDATE_CHECK_INTERVAL_MS ?? 24 * 60 * 60 * 1000,
);
const REQUEST_TIMEOUT_MS = Number(process.env.FIREHORSE_UPDATE_CHECK_TIMEOUT_MS ?? 2500);
const GITHUB_LATEST_RELEASE_URL = "https://api.github.com/repos/cinjoff/firehorse/releases/latest";
const RELEASES_URL = "https://github.com/cinjoff/firehorse/releases";

function isTruthy(value) {
  return value === "1" || value === "true" || value === "yes";
}

function shouldSkip() {
  return (
    isTruthy(process.env.FIREHORSE_SKIP_UPDATE_CHECK) ||
    isTruthy(process.env.FIREHORSE_OFFLINE) ||
    isTruthy(process.env.CLAUDE_OFFLINE) ||
    isTruthy(process.env.CI)
  );
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function tryReadJson(path) {
  try {
    return readJson(path);
  } catch {
    return undefined;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function extractVersion(input) {
  if (!input) return undefined;
  const match = String(input).match(/(?:^|[^0-9])v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/);
  return match?.[1];
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? "",
  };
}

function compareVersions(a, b) {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);
  if (!parsedA || !parsedB) return 0;

  for (const key of ["major", "minor", "patch"]) {
    if (parsedA[key] !== parsedB[key]) return parsedA[key] > parsedB[key] ? 1 : -1;
  }

  if (parsedA.prerelease === parsedB.prerelease) return 0;
  if (!parsedA.prerelease) return 1;
  if (!parsedB.prerelease) return -1;
  return parsedA.prerelease > parsedB.prerelease ? 1 : -1;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "firehorse-update-check",
      },
    });
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function buildMessage(currentVersion, latest) {
  const releaseUrl = latest.html_url ?? RELEASES_URL;
  return [
    `Firehorse update available: ${currentVersion} → ${latest.version}.`,
    "This can include Firehorse changes plus curated upstream skill/package updates.",
    "Update Claude plugin: /plugin update firehorse@firehorse (then /reload-plugins or restart if prompted)",
    `Release notes: ${releaseUrl}`,
  ].join("\n");
}

function buildAdditionalContext(currentVersion, latest) {
  const lines = [buildMessage(currentVersion, latest)];
  if (latest.body) {
    const body = String(latest.body).trim();
    if (body) {
      lines.push("", "Release changelog preview:", body.slice(0, 1500));
    }
  }
  return lines.join("\n");
}

async function main() {
  if (shouldSkip()) return;

  const plugin = readJson(join(PLUGIN_ROOT, ".claude-plugin", "plugin.json"));
  const currentVersion = extractVersion(plugin.version);
  if (!currentVersion) return;

  const cachePath = join(PLUGIN_DATA, "update-check.json");
  const now = Date.now();
  const cache = tryReadJson(cachePath) ?? {};

  let latest = cache.latest;
  if (!cache.checkedAt || now - cache.checkedAt > CHECK_INTERVAL_MS || !latest) {
    const release = await fetchJson(GITHUB_LATEST_RELEASE_URL);
    const version = extractVersion(release?.tag_name) ?? extractVersion(release?.name);
    latest = version
      ? {
          version,
          tagName: release.tag_name,
          name: release.name,
          html_url: release.html_url,
          body: release.body,
        }
      : undefined;
    writeJson(cachePath, { ...cache, checkedAt: now, latest });
  }

  if (!latest?.version || compareVersions(latest.version, currentVersion) <= 0) return;

  const lastNotifiedAt = cache.lastNotifiedAt ?? 0;
  const alreadyNotifiedRecently =
    cache.lastNotifiedVersion === latest.version && now - lastNotifiedAt < CHECK_INTERVAL_MS;
  if (alreadyNotifiedRecently) return;

  writeJson(cachePath, {
    ...cache,
    checkedAt: cache.checkedAt ?? now,
    latest,
    lastNotifiedAt: now,
    lastNotifiedVersion: latest.version,
  });

  const message = buildMessage(currentVersion, latest);
  process.stdout.write(
    `${JSON.stringify({
      systemMessage: message,
      suppressOutput: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: buildAdditionalContext(currentVersion, latest),
      },
    })}\n`,
  );
}

main().catch(() => {
  // Update checks should never make session startup noisy or fail.
});
