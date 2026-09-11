import type { GeneratedFile } from "./projection.js";

export interface GeneratedManifestEntries {
  readonly claudeCommands: readonly string[];
  readonly claudeSkills: readonly string[];
}

export function generatedManifestEntries(
  files: readonly GeneratedFile[],
): GeneratedManifestEntries {
  const claudeCommands = new Set<string>();
  const claudeSkills = new Set<string>();

  for (const file of files) {
    if (file.resourceKind === "workflow") {
      claudeCommands.add(`./${file.path.replace("packages/firehorse-claude/", "")}`);
    }

    if (file.resourceKind === "skill") {
      const skillPath = file.path.replace(/\/SKILL\.md$/, "");
      claudeSkills.add(`./${skillPath.replace("packages/firehorse-claude/", "")}`);
    }
  }

  return {
    claudeCommands: sorted(claudeCommands),
    claudeSkills: sorted(claudeSkills),
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
