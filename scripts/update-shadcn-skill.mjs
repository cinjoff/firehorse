#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const upstream = {
  name: "shadcn-ui",
  source: "https://github.com/shadcn-ui/ui.git",
  homepage: "https://github.com/shadcn-ui/ui",
  branch: "main",
  ref: "refs/heads/main",
  license: "MIT",
  adapterNamespace: "shadcn-ui",
  skillPath: "skills/shadcn",
  updateCommand: "pnpm upstreams:update:shadcn-ui",
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

function copySkillDir(sourcePath, targetPath) {
  if (!existsSync(join(sourcePath, "SKILL.md"))) {
    throw new Error(`Expected ${sourcePath}/SKILL.md in upstream clone`);
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { recursive: true, verbatimSymlinks: true });
}

function copyOptionalFile(sourcePath, targetPath) {
  if (!existsSync(sourcePath)) return false;

  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { verbatimSymlinks: true });
  return true;
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
  run(
    "git",
    [
      "clone",
      "--depth",
      "1",
      "--filter=blob:none",
      "--sparse",
      "--branch",
      upstream.branch,
      upstream.source,
      cloneDir,
    ],
    { stdio: "inherit" },
  );
  run("git", [
    "-C",
    cloneDir,
    "sparse-checkout",
    "set",
    "--no-cone",
    `/${upstream.skillPath}/`,
    "/LICENSE.md",
  ]);

  const commit = run("git", ["-C", cloneDir, "rev-parse", "HEAD"]);
  const sourceSkillPath = join(cloneDir, upstream.skillPath);
  const skillName = "shadcn";

  cleanDir(coreDir);
  cleanDir(claudeSkillsDir);
  cleanDir(piSkillsDir);

  copyOptionalFile(join(cloneDir, "LICENSE.md"), join(coreDir, "LICENSE.md"));
  copyOptionalFile(join(cloneDir, "LICENSE.md"), join(claudeSkillsDir, "LICENSE.md"));
  copyOptionalFile(join(cloneDir, "LICENSE.md"), join(piSkillsDir, "LICENSE.md"));

  copySkillDir(sourceSkillPath, join(coreDir, "skills", skillName));
  copySkillDir(sourceSkillPath, join(claudeSkillsDir, skillName));
  copySkillDir(sourceSkillPath, join(piSkillsDir, skillName));

  const skills = [
    {
      name: skillName,
      sourcePath: upstream.skillPath,
      corePath: `skills/${skillName}`,
      claudePath: `skills/${upstream.adapterNamespace}/${skillName}`,
      piPath: `skills/${upstream.adapterNamespace}/${skillName}`,
    },
  ];

  const metadata = {
    name: upstream.name,
    source: upstream.homepage,
    git: upstream.source,
    ref: upstream.ref,
    commit,
    license: upstream.license,
    adapterNamespace: upstream.adapterNamespace,
    upstreamRepositoryPath: upstream.skillPath,
    updateCommand: upstream.updateCommand,
    selectionPolicy:
      "Expose the official shadcn/ui agent skill because it provides required project-aware guidance for adding components, using registries, and applying presets reliably.",
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

  console.log(`Synced ${skills.length} ${upstream.name} skill at ${commit.slice(0, 12)}.`);
  console.log(`Core source: ${relative(repoRoot, coreDir)}`);
  console.log(`Claude mirror: ${relative(repoRoot, claudeSkillsDir)}`);
  console.log(`Pi mirror: ${relative(repoRoot, piSkillsDir)}`);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}
