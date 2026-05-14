#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const upstream = {
  name: "mattpocock-skills",
  source: "https://github.com/mattpocock/skills.git",
  homepage: "https://github.com/mattpocock/skills",
  ref: "main",
  license: "MIT",
  adapterNamespace: "mattpocock",
  updateCommand: "pnpm upstreams:update:mattpocock-skills",
};

const coreDir = join(repoRoot, "packages", "firehorse-core", "upstreams", upstream.name);
const claudeSkillsDir = join(
  repoRoot,
  "packages",
  "firehorse-claude",
  "skills",
  upstream.adapterNamespace,
);
const piSkillsDir = join(repoRoot, "packages", "firehorse-pi", "skills", upstream.adapterNamespace);

function run(command, args, options = {}) {
  const result = execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "inherit"],
    ...options,
  });
  return typeof result === "string" ? result.trim() : "";
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function cleanDir(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function copySkillDir(sourceRoot, skillPath, targetRoot) {
  const sourcePath = join(sourceRoot, skillPath);
  const relativeSkillPath = skillPath.replace(/^skills\//, "");
  const targetPath = join(targetRoot, relativeSkillPath);

  if (!existsSync(join(sourcePath, "SKILL.md"))) {
    throw new Error(`Expected ${skillPath}/SKILL.md in upstream clone`);
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { recursive: true, verbatimSymlinks: true });

  return {
    name: relativeSkillPath.split("/").at(-1),
    sourcePath: skillPath,
    corePath: `skills/${relativeSkillPath}`,
    claudePath: `skills/${upstream.adapterNamespace}/${relativeSkillPath}`,
    piPath: `skills/${upstream.adapterNamespace}/${relativeSkillPath}`,
  };
}

function replaceGeneratedSkillEntries(entries, prefix, generatedEntries) {
  const kept = entries.filter((entry) => !entry.startsWith(prefix));
  return [...kept, ...generatedEntries];
}

function updatePiManifest(packageJsonPath, prefix, generatedEntries) {
  const pkg = readJson(packageJsonPath);
  pkg.pi.skills = replaceGeneratedSkillEntries(pkg.pi.skills, prefix, generatedEntries);
  writeJson(packageJsonPath, pkg);
}

function updateClaudePluginManifest(pluginJsonPath, generatedEntries) {
  const manifest = readJson(pluginJsonPath);
  manifest.skills = replaceGeneratedSkillEntries(
    manifest.skills ?? [],
    `./skills/${upstream.adapterNamespace}/`,
    generatedEntries,
  );
  writeJson(pluginJsonPath, manifest);
}

const tmpRoot = join(tmpdir(), `firehorse-${upstream.name}-${process.pid}`);
rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpRoot, { recursive: true });

try {
  const cloneDir = join(tmpRoot, upstream.name);
  run("git", ["clone", "--depth", "1", "--branch", upstream.ref, upstream.source, cloneDir], {
    stdio: "inherit",
  });

  const commit = run("git", ["-C", cloneDir, "rev-parse", "HEAD"]);
  const upstreamPlugin = readJson(join(cloneDir, ".claude-plugin", "plugin.json"));
  const skillPaths = upstreamPlugin.skills.map((skillPath) =>
    skillPath.replace(/^\.\//, "").replace(/\/$/, ""),
  );

  cleanDir(coreDir);
  cleanDir(claudeSkillsDir);
  cleanDir(piSkillsDir);

  mkdirSync(join(coreDir, ".claude-plugin"), { recursive: true });
  cpSync(join(cloneDir, "LICENSE"), join(coreDir, "LICENSE"));
  cpSync(join(cloneDir, "LICENSE"), join(claudeSkillsDir, "LICENSE"));
  cpSync(join(cloneDir, "LICENSE"), join(piSkillsDir, "LICENSE"));
  cpSync(join(cloneDir, "README.md"), join(coreDir, "README.md"));
  cpSync(
    join(cloneDir, ".claude-plugin", "plugin.json"),
    join(coreDir, ".claude-plugin", "plugin.json"),
  );

  const skills = [];
  for (const skillPath of skillPaths) {
    skills.push(copySkillDir(cloneDir, skillPath, join(coreDir, "skills")));
    copySkillDir(cloneDir, skillPath, claudeSkillsDir);
    copySkillDir(cloneDir, skillPath, piSkillsDir);
  }

  const metadata = {
    name: upstream.name,
    source: upstream.homepage,
    git: upstream.source,
    ref: upstream.ref,
    commit,
    license: upstream.license,
    upstreamPluginName: upstreamPlugin.name,
    adapterNamespace: upstream.adapterNamespace,
    updateCommand: upstream.updateCommand,
    selectionPolicy:
      "Expose the skills listed by the upstream Claude plugin manifest; do not expose deprecated, in-progress, personal, or misc skills unless upstream promotes them into that manifest or Firehorse explicitly allow-lists them later.",
    skills,
  };
  writeJson(join(coreDir, "UPSTREAM.json"), metadata);

  const claudeManifestEntries = skills.map((skill) => `./${skill.claudePath}`);
  updateClaudePluginManifest(
    join(repoRoot, "packages", "firehorse-claude", ".claude-plugin", "plugin.json"),
    claudeManifestEntries,
  );

  const piManifestEntries = skills.map((skill) => `./${skill.piPath}`);
  updatePiManifest(
    join(repoRoot, "packages", "firehorse-pi", "package.json"),
    `./skills/${upstream.adapterNamespace}/`,
    piManifestEntries,
  );

  const rootPiManifestEntries = skills.map((skill) => `./packages/firehorse-pi/${skill.piPath}`);
  updatePiManifest(
    join(repoRoot, "package.json"),
    `./packages/firehorse-pi/skills/${upstream.adapterNamespace}/`,
    rootPiManifestEntries,
  );

  run("node", [join(repoRoot, "scripts", "write-update-manifests.mjs")]);

  console.log(`Synced ${skills.length} ${upstream.name} skills at ${commit.slice(0, 12)}.`);
  console.log(`Core source: ${relative(repoRoot, coreDir)}`);
  console.log(`Claude mirror: ${relative(repoRoot, claudeSkillsDir)}`);
  console.log(`Pi mirror: ${relative(repoRoot, piSkillsDir)}`);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}
