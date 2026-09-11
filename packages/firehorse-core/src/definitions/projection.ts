import path from "node:path";

import matter from "gray-matter";

import { renderUpstreamSkillTable, type UpstreamSkillResolutions } from "./upstream-resolution.js";
import type {
  DefinitionKind,
  FirehorseDefinition,
  SkillDefinition,
  WorkflowDefinition,
} from "./types.js";

export type ProjectionProvider = "claude";
export type ProjectionResourceKind = "workflow" | "skill";

export interface GeneratedFile {
  readonly path: string;
  readonly provider: ProjectionProvider;
  readonly resourceKind: ProjectionResourceKind;
  readonly definitionId: string;
  readonly sourcePath: string;
  readonly sourceHash: string;
  readonly content: string;
}

export interface ProjectionOptions {
  readonly repoRoot?: string;
  /**
   * `upstreams.lock.json`, resolved. Supplied, every workflow mirror carries the
   * exact invocation and path for each `upstreamSkills` entry; omitted, the
   * mirror falls back to the names the definition body already uses.
   */
  readonly upstreamResolutions?: UpstreamSkillResolutions;
}

export interface GeneratedProvenance {
  readonly firehorseGenerated: true;
  readonly firehorseKind: DefinitionKind;
  readonly firehorseId: string;
  readonly firehorseSource: string;
  readonly firehorseSourceSha256: string;
  readonly firehorseSchemaVersion: number;
}

export function projectDefinitions(
  definitions: readonly FirehorseDefinition[],
  options: ProjectionOptions = {},
): GeneratedFile[] {
  return definitions
    .flatMap((definition) => projectDefinition(definition, options))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function projectDefinition(
  definition: FirehorseDefinition,
  options: ProjectionOptions = {},
): GeneratedFile[] {
  switch (definition.kind) {
    case "workflow":
      return projectWorkflow(definition, options);
    case "skill":
      return projectSkill(definition, options);
  }
}

export function extractGeneratedProvenance(content: string): GeneratedProvenance | null {
  try {
    const data = matter(content).data as Record<string, unknown>;
    if (
      data["firehorseGenerated"] === true &&
      typeof data["firehorseKind"] === "string" &&
      typeof data["firehorseId"] === "string" &&
      typeof data["firehorseSource"] === "string" &&
      typeof data["firehorseSourceSha256"] === "string" &&
      typeof data["firehorseSchemaVersion"] === "number"
    ) {
      return {
        firehorseGenerated: true,
        firehorseKind: data["firehorseKind"] as DefinitionKind,
        firehorseId: data["firehorseId"],
        firehorseSource: data["firehorseSource"],
        firehorseSourceSha256: data["firehorseSourceSha256"],
        firehorseSchemaVersion: data["firehorseSchemaVersion"],
      };
    }
  } catch {
    return null;
  }

  return null;
}

function projectWorkflow(
  definition: WorkflowDefinition,
  options: ProjectionOptions,
): GeneratedFile[] {
  const sourcePath = sourcePathFor(definition.path, options.repoRoot);
  const common = generatedCommonFrontmatter(definition, sourcePath);
  const body = renderGeneratedBody(
    definition,
    sourcePath,
    upstreamSkillTableFor(definition, options),
  );

  return [
    {
      path: `packages/firehorse-claude/commands/firehorse/${definition.frontmatter.id}.md`,
      provider: "claude",
      resourceKind: "workflow",
      definitionId: definition.frontmatter.id,
      sourcePath,
      sourceHash: definition.sourceHash,
      content: renderMarkdownFile(
        {
          description: definition.frontmatter.description,
          "argument-hint": definition.frontmatter.argumentHint,
          ...common,
        },
        body,
      ),
    },
  ];
}

function projectSkill(definition: SkillDefinition, options: ProjectionOptions): GeneratedFile[] {
  const sourcePath = sourcePathFor(definition.path, options.repoRoot);
  const common = generatedCommonFrontmatter(definition, sourcePath);
  const body = renderGeneratedBody(definition, sourcePath);

  return [
    {
      path: `packages/firehorse-claude/skills/firehorse/${definition.frontmatter.id}/SKILL.md`,
      provider: "claude",
      resourceKind: "skill",
      definitionId: definition.frontmatter.id,
      sourcePath,
      sourceHash: definition.sourceHash,
      content: renderMarkdownFile(
        {
          name: definition.frontmatter.id,
          description: definition.frontmatter.description,
          license: definition.frontmatter.license,
          compatibility: definition.frontmatter.compatibility,
          ...common,
        },
        body,
      ),
    },
  ];
}

function generatedCommonFrontmatter(
  definition: FirehorseDefinition,
  sourcePath: string,
): Record<string, unknown> {
  return {
    firehorseGenerated: true,
    firehorseKind: definition.kind,
    firehorseId: definition.frontmatter.id,
    firehorseSource: sourcePath,
    firehorseSourceSha256: definition.sourceHash,
    firehorseSchemaVersion: definition.frontmatter.schemaVersion,
  };
}

/**
 * Sections the definition requires for the human editing it, but that cost the
 * running agent context and tell it nothing: the generated notice already says
 * the mirror is generated, and the Safety Gates say never to hand-edit one.
 */
const authoringOnlySections = new Set(["Projection Notes"]);

function upstreamSkillTableFor(
  definition: WorkflowDefinition,
  options: ProjectionOptions,
): string | null {
  if (!options.upstreamResolutions) {
    return null;
  }

  return renderUpstreamSkillTable({
    references: definition.frontmatter.upstreamSkills ?? [],
    resolutions: options.upstreamResolutions,
  });
}

function renderGeneratedBody(
  definition: FirehorseDefinition,
  sourcePath: string,
  upstreamSkillTable: string | null = null,
): string {
  let body = stripAuthoringOnlySections(definition.body);
  if (upstreamSkillTable) {
    body = appendToSection(body, "Supporting Capabilities", upstreamSkillTable);
  }
  return `${generatedNotice(definition, sourcePath)}\n\n${body}\n`;
}

/**
 * Append a block to the end of one `##` section, so generated material lands
 * beside the hand-written lines it belongs with rather than at the end of the
 * file. A body without that heading is returned unchanged — the parser already
 * refuses a definition missing a required section.
 */
export function appendToSection(body: string, heading: string, block: string): string {
  const lines = body.split("\n");
  let inFence = false;
  let start = -1;
  let end = lines.length;

  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    if (start === -1 && match[1]!.trim() === heading) {
      start = index;
    } else if (start !== -1) {
      end = index;
      break;
    }
  }

  if (start === -1) {
    return body;
  }

  const section = lines.slice(start, end);
  while (section.length > 0 && section.at(-1)!.trim() === "") {
    section.pop();
  }

  return [...lines.slice(0, start), ...section, "", block, "", ...lines.slice(end)]
    .join("\n")
    .trimEnd();
}

export function stripAuthoringOnlySections(body: string): string {
  const lines = body.split("\n");
  const kept: string[] = [];
  let skipping = false;
  let inFence = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
    }

    const heading = inFence ? null : /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      skipping = authoringOnlySections.has(heading[1]!.trim());
    }
    if (!skipping) {
      kept.push(line);
    }
  }

  return kept.join("\n").trim();
}

function generatedNotice(definition: FirehorseDefinition, sourcePath: string): string {
  return `<!--\nGenerated by Firehorse. DO NOT EDIT.\nEdit the canonical definition and run pnpm definitions:write instead.\nSource: ${sourcePath}\nDefinition ID: ${definition.frontmatter.id}\nDefinition kind: ${definition.kind}\nSource SHA-256: ${definition.sourceHash}\n-->`;
}

function renderMarkdownFile(frontmatter: Record<string, unknown>, body: string): string {
  return `${renderFrontmatter(frontmatter)}\n${body}`;
}

function renderFrontmatter(frontmatter: Record<string, unknown>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(pickDefined(frontmatter))) {
    lines.push(`${key}: ${formatYamlValue(value)}`);
  }
  lines.push("---");
  return `${lines.join("\n")}\n`;
}

function formatYamlValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatYamlValue(item)).join(", ")}]`;
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

function pickDefined<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined));
}

function sourcePathFor(sourcePath: string, repoRoot: string | undefined): string {
  const normalizedSource = sourcePath.replaceAll("\\", "/");
  if (!repoRoot || !path.isAbsolute(sourcePath)) {
    return normalizedSource;
  }

  return path.relative(repoRoot, sourcePath).replaceAll("\\", "/");
}
