#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const upstreamsRoot = join(repoRoot, "packages", "firehorse-core", "upstreams");

function run(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function findUpstreamManifests() {
  if (!existsSync(upstreamsRoot)) return [];

  return readdirSync(upstreamsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(upstreamsRoot, entry.name, "UPSTREAM.json"))
    .filter((path) => existsSync(path))
    .sort();
}

function checkBundledPiPackages(skipPackages = new Set()) {
  const packageJsonPath = join(repoRoot, "packages", "firehorse-pi", "package.json");
  if (!existsSync(packageJsonPath)) return 0;

  const pkg = readJson(packageJsonPath);
  const bundled = pkg.bundledDependencies ?? [];
  let stale = 0;

  for (const name of bundled) {
    if (skipPackages.has(name)) continue;

    const pinned = pkg.dependencies?.[name];
    if (!pinned) {
      console.warn(`${name}: bundled but missing from firehorse-pi dependencies`);
      stale += 1;
      continue;
    }

    let latest;
    try {
      latest = JSON.parse(run("npm", ["view", name, "version", "--json"]));
    } catch {
      console.warn(`${name}: could not resolve latest npm version`);
      stale += 1;
      continue;
    }

    if (latest === pinned) {
      console.log(`${name}: up to date (${pinned})`);
    } else {
      stale += 1;
      console.log(`${name}: update available`);
      console.log(`  pinned: ${pinned}`);
      console.log(`  latest: ${latest}`);
      console.log(
        "  update firehorse-pi dependency, review the diff, then release firehorse packages",
      );
    }
  }

  return stale;
}

const manifests = findUpstreamManifests();
if (manifests.length === 0) {
  console.log("No upstream skill manifests found.");
}

let staleCount = 0;
const npmUpstreams = new Set();

for (const manifestPath of manifests) {
  const manifest = readJson(manifestPath);

  if (manifest.npmPackage && manifest.version) {
    npmUpstreams.add(manifest.npmPackage);
    let latest;
    try {
      latest = JSON.parse(run("npm", ["view", manifest.npmPackage, "version", "--json"]));
    } catch {
      console.warn(
        `${manifest.name}: could not resolve latest npm version for ${manifest.npmPackage}`,
      );
      staleCount += 1;
      continue;
    }

    if (latest === manifest.version) {
      console.log(`${manifest.name}: up to date (${manifest.version})`);
    } else {
      staleCount += 1;
      console.log(`${manifest.name}: update available`);
      console.log(`  pinned: ${manifest.version}`);
      console.log(`  latest: ${latest}`);
      console.log(
        `  update ${manifest.npmPackage}, refresh shared mirrors, review the diff, then release firehorse packages`,
      );
    }

    continue;
  }

  const remote = manifest.git ?? `${manifest.source}.git`;
  const ref = manifest.ref ?? "main";
  const expected = manifest.commit;

  if (!remote || !expected) {
    console.warn(`${manifest.name ?? manifestPath}: missing git/source or commit`);
    staleCount += 1;
    continue;
  }

  const lsRemote = run("git", ["ls-remote", remote, ref]);
  const latest = lsRemote.split(/\s+/)[0];

  if (!latest) {
    console.warn(`${manifest.name}: could not resolve ${remote} ${ref}`);
    staleCount += 1;
    continue;
  }

  if (latest === expected) {
    console.log(`${manifest.name}: up to date (${expected.slice(0, 12)})`);
  } else {
    staleCount += 1;
    console.log(`${manifest.name}: update available`);
    console.log(`  pinned: ${expected}`);
    console.log(`  latest: ${latest}`);
    if (manifest.updateCommand) {
      console.log(
        `  run: ${manifest.updateCommand}, review the diff, then release firehorse packages`,
      );
    } else {
      console.log(
        "  refresh the upstream mirror, review the diff, then release firehorse packages",
      );
    }
  }
}

staleCount += checkBundledPiPackages(npmUpstreams);

process.exit(staleCount === 0 ? 0 : 1);
