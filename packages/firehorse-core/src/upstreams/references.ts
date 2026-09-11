import type { FirehorseDefinition } from "../definitions/types.js";
import { upstreamSkillKey } from "./lockfile.js";
import type { UpstreamSkillUsage } from "./types.js";

/**
 * Every `upstreamSkills` entry across the definitions, each carrying the workflow
 * that named it. This is what turns "a skill vanished" into "these workflows break".
 */
export function collectUpstreamSkillUsages(
  definitions: readonly FirehorseDefinition[],
): readonly UpstreamSkillUsage[] {
  const usages: UpstreamSkillUsage[] = [];

  for (const definition of definitions) {
    if (definition.kind !== "workflow") {
      continue;
    }
    for (const reference of definition.frontmatter.upstreamSkills ?? []) {
      usages.push({
        upstream: reference.upstream,
        id: reference.id,
        key: upstreamSkillKey(reference.upstream, reference.id),
        workflowId: definition.frontmatter.id,
        workflowPath: definition.path,
      });
    }
  }

  return usages;
}

/** Workflow IDs that reference a given `<plugin>:<skill>` key, ASCII-sorted and deduplicated. */
export function workflowsReferencing(
  usages: readonly UpstreamSkillUsage[],
  key: string,
): readonly string[] {
  return [
    ...new Set(usages.filter((usage) => usage.key === key).map((usage) => usage.workflowId)),
  ].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
