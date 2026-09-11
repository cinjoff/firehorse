import { z } from "zod";

export const UPSTREAMS_LOCK_SCHEMA_VERSION = 1;
export const UPSTREAMS_LOCK_PATH = "upstreams.lock.json";

/** Where a recorded skill key came from: `SKILL.md` frontmatter, or the containing directory. */
export const upstreamSkillNameSources = ["frontmatter", "directory"] as const;
export type UpstreamSkillNameSource = (typeof upstreamSkillNameSources)[number];

const nonEmptyStringSchema = z.string().min(1);
const sha256Schema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "Expected a lowercase hexadecimal SHA-256 digest.");

export const lockedUpstreamSkillSchema = z.strictObject({
  path: nonEmptyStringSchema,
  sha256: sha256Schema,
  nameSource: z.enum(upstreamSkillNameSources),
});

export const lockedUpstreamPluginSchema = z.strictObject({
  marketplace: nonEmptyStringSchema,
  version: nonEmptyStringSchema,
  skills: z.record(nonEmptyStringSchema, lockedUpstreamSkillSchema),
});

export const upstreamsLockfileSchema = z.strictObject({
  schemaVersion: z.literal(UPSTREAMS_LOCK_SCHEMA_VERSION),
  generatedAt: nonEmptyStringSchema.optional(),
  plugins: z.record(nonEmptyStringSchema, lockedUpstreamPluginSchema),
});

export type LockedUpstreamSkill = z.infer<typeof lockedUpstreamSkillSchema>;
export type LockedUpstreamPlugin = z.infer<typeof lockedUpstreamPluginSchema>;
export type UpstreamsLockfile = z.infer<typeof upstreamsLockfileSchema>;

/** A plugin the repo depends on, as declared in the plugin and marketplace manifests. */
export interface DeclaredUpstreamPlugin {
  readonly name: string;
  readonly marketplace: string;
}

/** A `SKILL.md` found under an installed plugin. */
export interface InstalledUpstreamSkill {
  /** Frontmatter `name`, falling back to the containing directory name. */
  readonly key: string;
  /** Posix path relative to the plugin root. */
  readonly path: string;
  readonly sha256: string;
  readonly nameSource: UpstreamSkillNameSource;
}

/** An installed plugin as read from `~/.claude/plugins/`. */
export interface InstalledUpstreamPlugin {
  readonly name: string;
  readonly marketplace: string;
  readonly version: string;
  readonly skills: readonly InstalledUpstreamSkill[];
}

/** One `upstreamSkills` entry, carrying the workflow that referenced it. */
export interface UpstreamSkillUsage {
  readonly upstream: string;
  readonly id: string;
  /** `<upstream>:<id>`. */
  readonly key: string;
  readonly workflowId: string;
  readonly workflowPath: string;
}

export type UpstreamDriftSeverity = "breaking" | "advisory";

export interface UpstreamDriftFinding {
  readonly code: string;
  readonly severity: UpstreamDriftSeverity;
  readonly message: string;
  readonly plugin?: string;
  readonly skill?: string;
  /** Workflow IDs whose `upstreamSkills` name the affected skill. */
  readonly affectedWorkflows?: readonly string[];
}

/** What the report actually compared against. */
export type UpstreamComparisonBasis = "installed" | "lockfile-only";

export interface UpstreamDriftReport {
  readonly basis: UpstreamComparisonBasis;
  readonly findings: readonly UpstreamDriftFinding[];
  readonly breaking: readonly UpstreamDriftFinding[];
  readonly advisory: readonly UpstreamDriftFinding[];
  readonly ok: boolean;
}

export class UpstreamsLockfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamsLockfileError";
  }
}
