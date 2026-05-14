#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const upstream = {
  name: "impeccable",
  source: "https://github.com/pbakaus/impeccable.git",
  homepage: "https://github.com/pbakaus/impeccable",
  ref: "main",
  license: "Apache-2.0",
  adapterNamespace: "pbakaus",
  updateCommand: "pnpm upstreams:update:impeccable",
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

const textExtensions = new Set([".md", ".mjs", ".js", ".json", ".txt"]);

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

function toPosix(path) {
  return path.split("\\").join("/");
}

function normalizePluginSkillEntries(skillsField) {
  if (Array.isArray(skillsField)) return skillsField;
  if (typeof skillsField === "string") return [skillsField];
  throw new Error("Expected upstream Claude plugin manifest to define skills");
}

function normalizeRelativePath(path) {
  return path.replace(/^\.\//, "").replace(/\/$/, "");
}

function discoverSkillPaths(cloneDir, skillsField) {
  const entries = normalizePluginSkillEntries(skillsField);
  const skillPaths = [];

  for (const entry of entries) {
    const normalizedEntry = normalizeRelativePath(entry);
    const absoluteEntry = join(cloneDir, normalizedEntry);

    if (existsSync(join(absoluteEntry, "SKILL.md"))) {
      skillPaths.push(normalizedEntry);
      continue;
    }

    if (!existsSync(absoluteEntry) || !statSync(absoluteEntry).isDirectory()) {
      throw new Error(`Expected upstream skill path or directory: ${entry}`);
    }

    for (const child of readdirSync(absoluteEntry, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;

      const skillPath = join(normalizedEntry, child.name);
      if (existsSync(join(cloneDir, skillPath, "SKILL.md"))) {
        skillPaths.push(toPosix(skillPath));
      }
    }
  }

  return [...new Set(skillPaths)].sort();
}

function copyDir(sourcePath, targetPath) {
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

function findAdapterSkillPath(cloneDir, skillName, candidates) {
  const found = candidates.find((candidate) => existsSync(join(cloneDir, candidate, "SKILL.md")));
  if (!found) {
    throw new Error(`Could not find generated adapter skill for ${skillName}`);
  }
  return found;
}

function findCoreSkillPath(cloneDir, skillName, fallbackSourcePath) {
  const canonicalSkillPath = "skill";
  if (skillName === "impeccable" && existsSync(join(cloneDir, canonicalSkillPath, "SKILL.md"))) {
    return canonicalSkillPath;
  }
  return fallbackSourcePath;
}

function rewriteGeneratedSkillPaths(targetDir, skillName) {
  const hardcodedScriptPaths = [
    `.claude/skills/${skillName}/scripts`,
    `.pi/skills/${skillName}/scripts`,
    `.agents/skills/${skillName}/scripts`,
    `plugin/skills/${skillName}/scripts`,
  ];

  function visit(path) {
    const stats = statSync(path);
    if (stats.isDirectory()) {
      for (const child of readdirSync(path)) visit(join(path, child));
      return;
    }

    const extension = `.${basename(path).split(".").slice(1).join(".")}`;
    const simpleExtension = basename(path).includes(".")
      ? `.${basename(path).split(".").pop()}`
      : "";
    if (!textExtensions.has(extension) && !textExtensions.has(simpleExtension)) return;

    let content = readFileSync(path, "utf8");
    for (const hardcodedPath of hardcodedScriptPaths) {
      content = content.split(hardcodedPath).join("scripts");
    }
    content = content
      .split("{{scripts_path}}")
      .join("scripts")
      .split("{{command_prefix}}")
      .join("/");
    writeFileSync(path, content);
  }

  visit(targetDir);
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
  const upstreamPackage = readJson(join(cloneDir, "package.json"));
  const upstreamPlugin = readJson(join(cloneDir, ".claude-plugin", "plugin.json"));
  const skillPaths = discoverSkillPaths(cloneDir, upstreamPlugin.skills);

  cleanDir(coreDir);
  cleanDir(claudeSkillsDir);
  cleanDir(piSkillsDir);

  mkdirSync(join(coreDir, ".claude-plugin"), { recursive: true });
  copyOptionalFile(join(cloneDir, "LICENSE"), join(coreDir, "LICENSE"));
  copyOptionalFile(join(cloneDir, "NOTICE.md"), join(coreDir, "NOTICE.md"));
  copyOptionalFile(join(cloneDir, "README.md"), join(coreDir, "README.md"));
  copyOptionalFile(join(cloneDir, "package.json"), join(coreDir, "package.json"));
  copyOptionalFile(
    join(cloneDir, ".claude-plugin", "plugin.json"),
    join(coreDir, ".claude-plugin", "plugin.json"),
  );

  for (const namespaceDir of [claudeSkillsDir, piSkillsDir]) {
    copyOptionalFile(join(cloneDir, "LICENSE"), join(namespaceDir, "LICENSE"));
    copyOptionalFile(join(cloneDir, "NOTICE.md"), join(namespaceDir, "NOTICE.md"));
  }

  const skills = [];
  for (const claudeManifestSkillPath of skillPaths) {
    const skillName = basename(claudeManifestSkillPath);
    const coreSourcePath = findCoreSkillPath(cloneDir, skillName, claudeManifestSkillPath);
    const claudeSourcePath = findAdapterSkillPath(cloneDir, skillName, [
      `plugin/skills/${skillName}`,
      `.claude/skills/${skillName}`,
      claudeManifestSkillPath,
    ]);
    const piSourcePath = findAdapterSkillPath(cloneDir, skillName, [
      `.pi/skills/${skillName}`,
      `.agents/skills/${skillName}`,
      claudeManifestSkillPath,
    ]);

    const coreTargetPath = join(coreDir, "skills", skillName);
    const claudeTargetPath = join(claudeSkillsDir, skillName);
    const piTargetPath = join(piSkillsDir, skillName);

    copyDir(join(cloneDir, coreSourcePath), coreTargetPath);
    copyDir(join(cloneDir, claudeSourcePath), claudeTargetPath);
    copyDir(join(cloneDir, piSourcePath), piTargetPath);

    rewriteGeneratedSkillPaths(claudeTargetPath, skillName);
    rewriteGeneratedSkillPaths(piTargetPath, skillName);

    skills.push({
      name: skillName,
      sourcePath: coreSourcePath,
      claudeSourcePath,
      piSourcePath,
      corePath: `skills/${skillName}`,
      claudePath: `skills/${upstream.adapterNamespace}/${skillName}`,
      piPath: `skills/${upstream.adapterNamespace}/${skillName}`,
    });
  }

  const metadata = {
    name: upstream.name,
    source: upstream.homepage,
    git: upstream.source,
    ref: upstream.ref,
    commit,
    license: upstream.license,
    upstreamPackageName: upstreamPackage.name,
    upstreamPackageVersion: upstreamPackage.version,
    upstreamPluginName: upstreamPlugin.name,
    upstreamPluginVersion: upstreamPlugin.version,
    adapterNamespace: upstream.adapterNamespace,
    updateCommand: upstream.updateCommand,
    selectionPolicy:
      "Expose the skill directories exported by the upstream Claude plugin manifest, using upstream's generated Claude and Pi variants for adapter mirrors and the canonical skill/ source for core provenance when available.",
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
