import { z } from "zod";

export const DEFINITION_SCHEMA_VERSION = 1;

export const definitionKinds = ["workflow", "skill"] as const;
export type DefinitionKind = (typeof definitionKinds)[number];

export const definitionKindDirectories = {
  workflow: "workflows",
  skill: "skills",
} as const satisfies Record<DefinitionKind, string>;

export const definitionIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "Use lowercase letters, numbers, and single hyphens; no leading, trailing, or repeated hyphens.",
  });

export const capabilityCategories = [
  "tools",
  "orchestration",
  "modalities",
  "environment",
] as const;
export type CapabilityCategory = (typeof capabilityCategories)[number];

const commonCapabilities = {
  tools: new Set([
    "read",
    "grep",
    "find",
    "ls",
    "bash",
    "edit",
    "write",
    "web-search",
    "fetch-content",
    "get-search-content",
  ]),
  orchestration: new Set([
    "subagents",
    "parallel-agents",
    "worktrees",
    "intercom",
    "review-gates",
  ]),
  modalities: new Set(["text", "vision"]),
  environment: new Set([
    "filesystem",
    "git",
    "github",
    "node",
    "pnpm",
    "superset",
    "conductor",
    "tmux",
    "terminal",
  ]),
} as const satisfies Record<CapabilityCategory, ReadonlySet<string>>;

const extensionCapabilityPattern = /^[a-z][a-z0-9-]*:[a-zA-Z0-9_./-]+$/;

function capabilityValueSchema(category: CapabilityCategory) {
  return z.string().superRefine((value, ctx) => {
    if (
      commonCapabilities[category].has(value) ||
      extensionCapabilityPattern.test(value)
    ) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unsupported ${category} capability '${value}'. Use a documented common value or an extension-prefixed value like 'mcp:github'.`,
    });
  });
}

export const capabilityDeclarationSchema = z
  .object({
    tools: z.array(capabilityValueSchema("tools")).min(1).optional(),
    orchestration: z
      .array(capabilityValueSchema("orchestration"))
      .min(1)
      .optional(),
    modalities: z.array(capabilityValueSchema("modalities")).min(1).optional(),
    environment: z.array(capabilityValueSchema("environment")).min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Capability declarations must contain at least one category.",
      });
    }
  });

export const definitionReferenceSchema = z
  .object({
    id: definitionIdSchema,
  })
  .strict();

export const upstreamSkillReferenceSchema = z
  .object({
    upstream: definitionIdSchema,
    id: definitionIdSchema,
  })
  .strict();

const commonDefinitionFrontmatterSchema = z.object({
  schemaVersion: z.literal(DEFINITION_SCHEMA_VERSION),
  id: definitionIdSchema,
  kind: z.enum(definitionKinds),
  title: z.string().min(1),
  description: z.string().min(1).max(1024),
  aliases: z.array(definitionIdSchema).optional(),
  deprecated: z.boolean().optional(),
  replacedBy: definitionIdSchema.optional(),
  requires: capabilityDeclarationSchema.optional(),
  optional: capabilityDeclarationSchema.optional(),
});

export const workflowFrontmatterSchema = commonDefinitionFrontmatterSchema
  .extend({
    kind: z.literal("workflow"),
    argumentHint: z.string().min(1).optional(),
    supportingSkills: z.array(definitionReferenceSchema).optional(),
    upstreamSkills: z.array(upstreamSkillReferenceSchema).optional(),
  })
  .strict();

export const skillFrontmatterSchema = commonDefinitionFrontmatterSchema
  .extend({
    kind: z.literal("skill"),
    license: z.string().min(1).optional(),
    compatibility: z.string().min(1).max(500).optional(),
  })
  .strict();

export const definitionFrontmatterSchema = z.discriminatedUnion("kind", [
  workflowFrontmatterSchema,
  skillFrontmatterSchema,
]);

export type CapabilityDeclaration = z.infer<typeof capabilityDeclarationSchema>;
export type DefinitionReference = z.infer<typeof definitionReferenceSchema>;
export type UpstreamSkillReference = z.infer<
  typeof upstreamSkillReferenceSchema
>;
export type WorkflowFrontmatter = z.infer<typeof workflowFrontmatterSchema>;
export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;
export type DefinitionFrontmatter = z.infer<typeof definitionFrontmatterSchema>;

export interface DefinitionDiagnostic {
  code: string;
  message: string;
  path?: string;
  field?: string;
  section?: string;
}

export class DefinitionValidationError extends Error {
  readonly diagnostics: readonly DefinitionDiagnostic[];

  constructor(diagnostics: readonly DefinitionDiagnostic[], message?: string) {
    super(message ?? formatDefinitionDiagnostics(diagnostics));
    this.name = "DefinitionValidationError";
    this.diagnostics = diagnostics;
  }
}

export interface FirehorseDefinitionBase<
  TKind extends DefinitionKind,
  TFrontmatter extends DefinitionFrontmatter,
> {
  readonly kind: TKind;
  readonly frontmatter: TFrontmatter;
  readonly body: string;
  readonly path: string;
  readonly sourceContent: string;
  readonly sourceHash: string;
}

export type WorkflowDefinition = FirehorseDefinitionBase<
  "workflow",
  WorkflowFrontmatter
>;
export type SkillDefinition = FirehorseDefinitionBase<"skill", SkillFrontmatter>;

export type FirehorseDefinition = WorkflowDefinition | SkillDefinition;

export const requiredSectionsByKind = {
  workflow: [
    "Purpose",
    "Usage",
    "Inputs",
    "Outputs",
    "Supporting Capabilities",
    "Orchestration Intent",
    "Safety Gates",
    "Procedure",
    "Projection Notes",
  ],
  skill: [
    "Purpose",
    "Usage",
    "Inputs",
    "Outputs",
    "Instructions",
    "Boundaries",
    "Examples",
    "Projection Notes",
  ],
} as const satisfies Record<DefinitionKind, readonly string[]>;

export function formatDefinitionDiagnostics(
  diagnostics: readonly DefinitionDiagnostic[],
): string {
  return diagnostics
    .map((diagnostic) => {
      const location = [
        diagnostic.path,
        diagnostic.field ? `field ${diagnostic.field}` : undefined,
        diagnostic.section ? `section ${diagnostic.section}` : undefined,
      ]
        .filter(Boolean)
        .join(" ");
      return `${diagnostic.code}${location ? ` (${location})` : ""}: ${diagnostic.message}`;
    })
    .join("\n");
}
