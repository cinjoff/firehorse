import type { GeneratedFile } from "./projection.js";

export interface GeneratedManifestEntries {
  readonly rootPiSkills: readonly string[];
  readonly rootPiPrompts: readonly string[];
  readonly packagePiSkills: readonly string[];
  readonly packagePiPrompts: readonly string[];
  readonly claudeCommands: readonly string[];
  readonly claudeSkills: readonly string[];
  readonly claudeAgents: readonly string[];
}

export function generatedManifestEntries(
  files: readonly GeneratedFile[],
): GeneratedManifestEntries {
  const rootPiSkills = new Set<string>();
  const rootPiPrompts = new Set<string>();
  const packagePiSkills = new Set<string>();
  const packagePiPrompts = new Set<string>();
  const claudeCommands = new Set<string>();
  const claudeSkills = new Set<string>();
  const claudeAgents = new Set<string>();

  for (const file of files) {
    if (file.provider === "pi" && file.resourceKind === "workflow") {
      rootPiPrompts.add(`./${file.path}`);
      packagePiPrompts.add(`./${file.path.replace("packages/firehorse-pi/", "")}`);
    }

    if (file.provider === "pi" && file.resourceKind === "skill") {
      const skillPath = file.path.replace(/\/SKILL\.md$/, "");
      rootPiSkills.add(`./${skillPath}`);
      packagePiSkills.add(`./${skillPath.replace("packages/firehorse-pi/", "")}`);
    }

    if (file.provider === "claude" && file.resourceKind === "workflow") {
      claudeCommands.add(`./${file.path.replace("packages/firehorse-claude/", "")}`);
    }

    if (file.provider === "claude" && file.resourceKind === "skill") {
      const skillPath = file.path.replace(/\/SKILL\.md$/, "");
      claudeSkills.add(`./${skillPath.replace("packages/firehorse-claude/", "")}`);
    }

    if (file.provider === "claude" && file.resourceKind === "agent-role") {
      claudeAgents.add(`./${file.path.replace("packages/firehorse-claude/", "")}`);
    }
  }

  return {
    rootPiSkills: sorted(rootPiSkills),
    rootPiPrompts: sorted(rootPiPrompts),
    packagePiSkills: sorted(packagePiSkills),
    packagePiPrompts: sorted(packagePiPrompts),
    claudeCommands: sorted(claudeCommands),
    claudeSkills: sorted(claudeSkills),
    claudeAgents: sorted(claudeAgents),
  };
}

export function mergeGeneratedManifestEntries(
  existing: readonly string[] | undefined,
  generated: readonly string[],
  generatedPathPrefix: string,
): string[] {
  const retained = (existing ?? []).filter(
    (entry) => !entry.startsWith(generatedPathPrefix),
  );
  return [...retained, ...generated].filter(uniqueByValue);
}

function sorted(values: ReadonlySet<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function uniqueByValue(value: string, index: number, values: readonly string[]): boolean {
  return values.indexOf(value) === index;
}
