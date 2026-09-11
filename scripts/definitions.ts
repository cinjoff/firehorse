#!/usr/bin/env tsx
import { readFile, rm, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  DefinitionValidationError,
  assertValidDefinitionSet,
  extractGeneratedProvenance,
  generatedManifestEntries,
  mergeGeneratedManifestEntries,
  projectDefinitions,
  resolveUpstreamSkills,
  type GeneratedFile,
} from "../packages/firehorse-core/src/definitions/index.js";
import { loadDefinitions, listMarkdownFiles } from "./lib/definitions-io.js";
import { readUpstreamsState, resolveKnownUpstreamSkills } from "./lib/upstreams-io.js";

interface CheckResult {
  readonly ok: boolean;
  readonly messages: readonly string[];
}

type Mode = "check" | "write";

const repoRoot = process.cwd();

const generatedDirectories = [
  "packages/firehorse-claude/commands/firehorse",
  "packages/firehorse-claude/skills/firehorse",
];

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));

  try {
    const definitions = await loadDefinitions(repoRoot);

    // Upstream references are validated against on-disk truth when
    // ~/.claude/plugins/ exists, and against upstreams.lock.json alone when it
    // does not, so the gate never claims it compared something it did not.
    const upstreams = await readUpstreamsState(repoRoot);
    const { known, source } = resolveKnownUpstreamSkills(upstreams);
    assertValidDefinitionSet(definitions, {
      knownUpstreamSkills: known,
      knownUpstreamSkillsSource: source,
    });

    // Mirrors resolve upstream skills from the committed lockfile, never from
    // ~/.claude/plugins/, so the generated paths are the same on CI as here.
    const generatedFiles = projectDefinitions(definitions, {
      repoRoot,
      upstreamResolutions: resolveUpstreamSkills(upstreams.lockfile),
    });
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
        : `definitions:check validated ${definitions.length} definitions, ${generatedFiles.length} generated mirrors, manifests, and upstream skill references against ${source}.`,
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
    if (!provenance) {
      hasErrors = true;
      messages.push(
        `refusing to ${mode === "write" ? "overwrite" : "accept"} unprovenanced generated target: ${file.path}`,
      );
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
    transformJsonFile("packages/firehorse-claude/.claude-plugin/plugin.json", (json) => {
      const manifest = json as {
        commands?: string[];
        skills?: string[];
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
