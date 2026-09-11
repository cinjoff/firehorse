import path from "node:path";

import matter from "gray-matter";

import type {
  AgentRoleDefinition,
  DefinitionKind,
  FirehorseDefinition,
  SkillDefinition,
  WorkflowDefinition,
} from "./types.js";

export type ProjectionProvider = "pi" | "claude";
export type ProjectionResourceKind = "workflow" | "skill" | "agent-role";

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
}

export interface GeneratedProvenance {
  readonly firehorseGenerated: true;
  readonly firehorseKind: DefinitionKind;
  readonly firehorseId: string;
  readonly firehorseSource: string;
  readonly firehorseSourceSha256: string;
  readonly firehorseSchemaVersion: number;
}

const claudeToolNames = new Map<string, string>([
  ["read", "Read"],
  ["grep", "Grep"],
  ["find", "Glob"],
  ["ls", "LS"],
  ["bash", "Bash"],
  ["edit", "Edit"],
  ["write", "Write"],
]);

export function nativeName(id: string): string {
  return `horse-${id}`;
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
    case "agent-role":
      return projectAgentRole(definition, options);
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
  const name = nativeName(definition.frontmatter.id);
  const nativeNames = [name, ...(definition.frontmatter.nativeAliases ?? [])];
  const common = generatedCommonFrontmatter(definition, sourcePath);
  const body = renderGeneratedBody(definition, sourcePath);

  return nativeNames.flatMap((nativeWorkflowName) => [
    {
      path: `packages/firehorse-pi/prompts/firehorse/${nativeWorkflowName}.md`,
      provider: "pi" as const,
      resourceKind: "workflow" as const,
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
    {
      path: `packages/firehorse-claude/commands/firehorse/${nativeWorkflowName}.md`,
      provider: "claude" as const,
      resourceKind: "workflow" as const,
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
  ]);
}

function projectSkill(definition: SkillDefinition, options: ProjectionOptions): GeneratedFile[] {
  const sourcePath = sourcePathFor(definition.path, options.repoRoot);
  const common = generatedCommonFrontmatter(definition, sourcePath);
  const body = renderGeneratedBody(definition, sourcePath);

  return [
    {
      path: `packages/firehorse-pi/skills/firehorse/${definition.frontmatter.id}/SKILL.md`,
      provider: "pi",
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

function projectAgentRole(
  definition: AgentRoleDefinition,
  options: ProjectionOptions,
): GeneratedFile[] {
  const sourcePath = sourcePathFor(definition.path, options.repoRoot);
  const name = definition.frontmatter.id;
  const common = generatedCommonFrontmatter(definition, sourcePath);
  const body = `${definition.body.trim()}\n`;
  const piFrontmatter = pickDefined({
    name,
    description: definition.frontmatter.description,
    package: definition.frontmatter.package,
    tools: definition.frontmatter.tools?.join(", "),
    extensions: definition.frontmatter.extensions?.join(", "),
    model: definition.frontmatter.model,
    fallbackModels: definition.frontmatter.fallbackModels?.join(", "),
    thinking: definition.frontmatter.thinking,
    systemPromptMode: definition.frontmatter.systemPromptMode,
    inheritProjectContext: definition.frontmatter.inheritProjectContext,
    inheritSkills: definition.frontmatter.inheritSkills,
    defaultContext: definition.frontmatter.defaultContext,
    skills: definition.frontmatter.skills?.join(", "),
    output: definition.frontmatter.output,
    defaultReads: definition.frontmatter.defaultReads?.join(", "),
    defaultProgress: definition.frontmatter.defaultProgress,
    interactive: definition.frontmatter.interactive,
    maxSubagentDepth: definition.frontmatter.maxSubagentDepth,
    ...common,
  });
  const claudeTools = (definition.frontmatter.tools ?? [])
    .map((tool) => claudeToolNames.get(tool))
    .filter((tool): tool is string => Boolean(tool));

  return [
    {
      path: `packages/firehorse-pi/agents/${name}.md`,
      provider: "pi",
      resourceKind: "agent-role",
      definitionId: definition.frontmatter.id,
      sourcePath,
      sourceHash: definition.sourceHash,
      content: renderMarkdownFile(piFrontmatter, body),
    },
    {
      path: `packages/firehorse-claude/agents/${name}.md`,
      provider: "claude",
      resourceKind: "agent-role",
      definitionId: definition.frontmatter.id,
      sourcePath,
      sourceHash: definition.sourceHash,
      content: renderMarkdownFile(
        {
          name,
          description: definition.frontmatter.description,
          tools: claudeTools.length > 0 ? claudeTools.join(", ") : undefined,
          effort: definition.frontmatter.thinking,
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

function renderGeneratedBody(definition: FirehorseDefinition, sourcePath: string): string {
  return `${generatedNotice(definition, sourcePath)}\n\n${definition.body.trim()}\n`;
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
