#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const upstreamsRoot = join(repoRoot, "packages", "firehorse-core", "upstreams");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function findUpstreamManifests() {
  if (!existsSync(upstreamsRoot)) return [];

  return readdirSync(upstreamsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(upstreamsRoot, entry.name, "UPSTREAM.json"))
    .filter((path) => existsSync(path))
    .sort();
}

function summarizeUpstream(manifest) {
  return {
    name: manifest.name,
    source: manifest.source,
    ...(manifest.git ? { git: manifest.git } : {}),
    ...(manifest.ref ? { ref: manifest.ref } : {}),
    ...(manifest.commit ? { commit: manifest.commit } : {}),
    ...(manifest.npmPackage ? { npmPackage: manifest.npmPackage } : {}),
    ...(manifest.version ? { version: manifest.version } : {}),
    ...(manifest.upstreamPackageVersion
      ? { upstreamPackageVersion: manifest.upstreamPackageVersion }
      : {}),
    ...(manifest.upstreamPluginVersion
      ? { upstreamPluginVersion: manifest.upstreamPluginVersion }
      : {}),
    license: manifest.license,
    selectionPolicy: manifest.selectionPolicy,
    ...(manifest.updateCommand ? { updateCommand: manifest.updateCommand } : {}),
    ...(manifest.marketplacePluginName
      ? { marketplacePluginName: manifest.marketplacePluginName }
      : {}),
    ...(Array.isArray(manifest.skills) ? { skillCount: manifest.skills.length } : {}),
    ...(Array.isArray(manifest.agents) ? { agentCount: manifest.agents.length } : {}),
    ...(Array.isArray(manifest.extensions) ? { extensionCount: manifest.extensions.length } : {}),
    ...(Array.isArray(manifest.pluginDependencies)
      ? { pluginDependencyCount: manifest.pluginDependencies.length }
      : {}),
  };
}

const piPackagePath = join(repoRoot, "packages", "firehorse-pi", "package.json");
const claudePluginPath = join(
  repoRoot,
  "packages",
  "firehorse-claude",
  ".claude-plugin",
  "plugin.json",
);

const piPackage = readJson(piPackagePath);
const claudePlugin = readJson(claudePluginPath);
const upstreams = findUpstreamManifests().map((path) => summarizeUpstream(readJson(path)));

const bundledPiPackages = Object.fromEntries(
  (piPackage.bundledDependencies ?? []).map((name) => [
    name,
    piPackage.dependencies?.[name] ?? null,
  ]),
);

const piUpdateManifest = {
  schemaVersion: 1,
  adapter: "pi",
  packageName: piPackage.name,
  version: piPackage.version,
  updateCommand: "pi update npm:firehorse-pi",
  upstreams,
  bundledPiPackages,
};

const claudeUpdateManifest = {
  schemaVersion: 1,
  adapter: "claude",
  pluginName: claudePlugin.name,
  version: claudePlugin.version,
  updateCommand: "/plugin update firehorse@firehorse",
  upstreams,
};

writeJson(join(repoRoot, "packages", "firehorse-pi", "firehorse.update.json"), piUpdateManifest);
writeJson(
  join(repoRoot, "packages", "firehorse-claude", "firehorse.update.json"),
  claudeUpdateManifest,
);

piPackage.firehorse = {
  updateManifest: piUpdateManifest,
};
writeJson(piPackagePath, piPackage);

console.log("Wrote Firehorse update manifests.");
