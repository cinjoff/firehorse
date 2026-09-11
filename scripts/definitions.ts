#!/usr/bin/env tsx
import { readdir, readFile, rm, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  DefinitionValidationError,
  assertValidDefinitionSet,
  extractGeneratedProvenance,
  generatedManifestEntries,
  mergeGeneratedManifestEntries,
  parseDefinitionFile,
  projectDefinitions,
  type FirehorseDefinition,
  type GeneratedFile,
} from "../packages/firehorse-core/src/definitions/index.js";

interface CheckResult {
  readonly ok: boolean;
  readonly messages: readonly string[];
}

type Mode = "check" | "write";

const repoRoot = process.cwd();
const definitionsRoot = path.join(repoRoot, "packages/firehorse-core/definitions");

const generatedDirectories = [
  "packages/firehorse-pi/prompts/firehorse",
  "packages/firehorse-pi/skills/firehorse",
  "packages/firehorse-pi/agents",
  "packages/firehorse-claude/commands/firehorse",
  "packages/firehorse-claude/skills/firehorse",
  "packages/firehorse-claude/agents",
];

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));

  try {
    const definitions = await loadDefinitions();
    assertValidDefinitionSet(definitions, {
      knownUpstreamSkills: await loadKnownUpstreamSkills(),
    });

    const generatedFiles = projectDefinitions(definitions, { repoRoot });
    const fileResult = await syncGeneratedFiles(generatedFiles, mode);
    const manifestResult = await syncManifests(generatedFiles, mode);
    const messages = [...fileResult.messages, ...manifestResult.messages];
    const ok = fileResult.ok && manifestResult.ok;

    for (const message of messages) {
      console.log(message);
    }

    if (!ok) {
      process.exitCode = 1;
      return;
    }

    console.log(
      mode === "write"
        ? `definitions:write updated ${generatedFiles.length} generated mirrors and manifests.`
        : `definitions:check validated ${definitions.length} definitions, ${generatedFiles.length} generated mirrors, and manifests.`,
    );
  } catch (error) {
    if (error instanceof DefinitionValidationError) {
      console.error(error.message);
    } else if (error instanceof Error) {
      console.error(error.stack ?? error.message);
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  }
}

function parseMode(args: readonly string[]): Mode {
  if (args.includes("--write")) {
    return "write";
  }
  if (args.includes("--check")) {
    return "check";
  }
  throw new Error("Usage: pnpm definitions:write | pnpm definitions:check");
}

async function loadDefinitions(): Promise<FirehorseDefinition[]> {
  const files = (await listMarkdownFiles(definitionsRoot)).sort((a, b) => a.localeCompare(b));
  return Promise.all(files.map((file) => parseDefinitionFile(file)));
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return listMarkdownFiles(fullPath);
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
}

async function loadKnownUpstreamSkills(): Promise<ReadonlySet<string>> {
  const upstreamsRoot = path.join(repoRoot, "packages/firehorse-core/upstreams");
  const keys = new Set<string>();
  for (const entry of await readdir(upstreamsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const manifestPath = path.join(upstreamsRoot, entry.name, "UPSTREAM.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      name?: string;
      skills?: Array<{ name?: string }>;
    };
    if (!manifest.name || !Array.isArray(manifest.skills)) {
      continue;
    }
    for (const skill of manifest.skills) {
      if (skill.name) {
        keys.add(`${manifest.name}:${skill.name}`);
      }
    }
  }
  return keys;
}

async function syncGeneratedFiles(
  files: readonly GeneratedFile[],
  mode: Mode,
): Promise<CheckResult> {
  const messages: string[] = [];
  let hasErrors = false;
  const expected = new Map(files.map((file) => [file.path, file]));

  for (const file of files) {
    const absolutePath = path.join(repoRoot, file.path);
    const current = await readFileIfExists(absolutePath);
    if (current === null) {
      if (mode === "write") {
        await mkdir(path.dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, file.content);
        messages.push(`created ${file.path}`);
      } else {
        messages.push(`missing generated mirror: ${file.path}`);
      }
      continue;
    }

    const provenance = extractGeneratedProvenance(current);
    if (!provenance && file.resourceKind !== "agent-role") {
      hasErrors = true;
      messages.push(
        `refusing to ${mode === "write" ? "overwrite" : "accept"} unprovenanced generated target: ${file.path}`,
      );
      continue;
    }

    if (!provenance && file.resourceKind === "agent-role" && mode !== "write") {
      messages.push(`stale generated mirror: ${file.path}`);
      continue;
    }

    if (current !== file.content) {
      if (mode === "write") {
        await writeFile(absolutePath, file.content);
        messages.push(`updated ${file.path}`);
      } else {
        messages.push(`stale generated mirror: ${file.path}`);
      }
    }
  }

  for (const stalePath of await findStaleGeneratedFiles(expected)) {
    const absolutePath = path.join(repoRoot, stalePath);
    const current = await readFile(absolutePath, "utf8");
    const provenance = extractGeneratedProvenance(current);
    if (!provenance) {
      continue;
    }

    if (mode === "write") {
      await rm(absolutePath);
      messages.push(`removed stale generated mirror ${stalePath}`);
    } else {
      messages.push(`stale generated mirror should be removed: ${stalePath}`);
    }
  }

  return {
    ok: mode === "write" ? !hasErrors : messages.length === 0,
    messages,
  };
}

async function findStaleGeneratedFiles(
  expected: ReadonlyMap<string, GeneratedFile>,
): Promise<string[]> {
  const stale: string[] = [];
  for (const directory of generatedDirectories) {
    const absoluteDirectory = path.join(repoRoot, directory);
    if (!(await exists(absoluteDirectory))) {
      continue;
    }
    for (const file of await listMarkdownFiles(absoluteDirectory)) {
      const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
      if (!expected.has(relative)) {
        stale.push(relative);
      }
    }
  }
  return stale.sort((a, b) => a.localeCompare(b));
}

async function syncManifests(files: readonly GeneratedFile[], mode: Mode): Promise<CheckResult> {
  const entries = generatedManifestEntries(files);
  const manifestTargets = await Promise.all([
    transformJsonFile("package.json", (json) => {
      const root = json as { pi?: { skills?: string[]; prompts?: string[] } };
      root.pi ??= {};
      root.pi.skills = mergeGeneratedManifestEntries(
        root.pi.skills,
        entries.rootPiSkills,
        "./packages/firehorse-pi/skills/firehorse/",
      );
      root.pi.prompts = mergeGeneratedManifestEntries(
        root.pi.prompts,
        entries.rootPiPrompts,
        "./packages/firehorse-pi/prompts/firehorse/",
      );
      return root;
    }),
    transformJsonFile("packages/firehorse-pi/package.json", (json) => {
      const manifest = json as {
        files?: string[];
        pi?: { skills?: string[]; prompts?: string[] };
      };
      manifest.files = mergeGeneratedManifestEntries(manifest.files, ["agents"], "agents");
      manifest.pi ??= {};
      manifest.pi.skills = mergeGeneratedManifestEntries(
        manifest.pi.skills,
        entries.packagePiSkills,
        "./skills/firehorse/",
      );
      manifest.pi.prompts = mergeGeneratedManifestEntries(
        manifest.pi.prompts,
        entries.packagePiPrompts,
        "./prompts/firehorse/",
      );
      return manifest;
    }),
    transformJsonFile("packages/firehorse-claude/.claude-plugin/plugin.json", (json) => {
      const manifest = json as {
        commands?: string[];
        skills?: string[];
        agents?: string[];
      };
      manifest.commands = mergeGeneratedManifestEntries(
        manifest.commands,
        entries.claudeCommands,
        "./commands/firehorse/",
      );
      manifest.skills = mergeGeneratedManifestEntries(
        manifest.skills,
        entries.claudeSkills,
        "./skills/firehorse/",
      );
      manifest.agents = mergeGeneratedManifestEntriesWithStalePrefixes(
        manifest.agents,
        entries.claudeAgents,
        ["./agents/firehorse/"],
      );
      return manifest;
    }),
  ]);

  const messages: string[] = [];
  for (const target of manifestTargets) {
    if (target.current === target.expected) {
      continue;
    }

    if (mode === "write") {
      await writeFile(path.join(repoRoot, target.path), target.expected);
      messages.push(`updated manifest ${target.path}`);
    } else {
      messages.push(`stale manifest ${target.path}`);
    }
  }

  return { ok: messages.length === 0 || mode === "write", messages };
}

function mergeGeneratedManifestEntriesWithStalePrefixes(
  existing: readonly string[] | undefined,
  generated: readonly string[],
  staleGeneratedPathPrefixes: readonly string[],
): string[] {
  const retained = (existing ?? []).filter(
    (entry) => !staleGeneratedPathPrefixes.some((prefix) => entry.startsWith(prefix)),
  );
  return [...retained, ...generated].filter(
    (value, index, values) => values.indexOf(value) === index,
  );
}

async function transformJsonFile(
  relativePath: string,
  transform: (json: unknown) => unknown,
): Promise<{ path: string; current: string; expected: string }> {
  const absolutePath = path.join(repoRoot, relativePath);
  const current = await readFile(absolutePath, "utf8");
  const json = JSON.parse(current) as unknown;
  const expectedJson = transform(json);
  return {
    path: relativePath,
    current,
    expected: `${JSON.stringify(expectedJson, null, 2)}\n`,
  };
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

void main();
