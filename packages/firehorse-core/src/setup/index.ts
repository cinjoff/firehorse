import { z } from "zod";

export const FIREHORSE_SETUP_MANIFEST_SCHEMA_VERSION = 3;
export const FIREHORSE_SETUP_MANIFEST_PATH = ".firehorse/manifest.json";

const nonEmptyStringSchema = z.string().min(1);
const timestampSchema = z.string().min(1);
const commitSchema = z
  .string()
  .regex(/^[0-9a-f]{7,40}$/, "Expected a lowercase hexadecimal git commit SHA.");

export const firehorseSetupManifestSchema = z.strictObject({
  schemaVersion: z.literal(FIREHORSE_SETUP_MANIFEST_SCHEMA_VERSION),
  setup: z
    .strictObject({
      mattPocockSkills: z
        .strictObject({
          version: nonEmptyStringSchema,
          at: timestampSchema,
        })
        .optional(),
    })
    .optional(),
  index: z
    .strictObject({
      commit: commitSchema,
      at: timestampSchema,
      graph: z.boolean().optional(),
      /**
       * What the memory pass wrote, rather than that it ran. #232 recorded
       * `true` for a pass that had failed, which a boolean makes easy: nothing
       * has to be true for you to write one. A count has to come from reading
       * the store back, so the optimistic version of this field does not
       * typecheck.
       */
      memory: z
        .strictObject({
          engine: z.literal("claude-mem"),
          observations: z.number().int().nonnegative(),
          at: timestampSchema,
        })
        .optional(),
    })
    .optional(),
  /**
   * Which repo anchors exist, recorded once so a later workflow reads the
   * manifest instead of re-probing the tree on every invocation. Machine-specific
   * facts stay out: whether the memory store or the graph is reachable here is
   * what `index.memory` and `index.graph` report.
   */
  anchors: z
    .strictObject({
      design: z.boolean().optional(),
      codebase: z.array(nonEmptyStringSchema).optional(),
      context: z.boolean().optional(),
      agents: z.boolean().optional(),
      adr: z.boolean().optional(),
    })
    .optional(),
  upstreams: z
    .strictObject({
      checkedAt: timestampSchema,
    })
    .optional(),
});

export type FirehorseSetupManifest = z.infer<typeof firehorseSetupManifestSchema>;

export type FirehorseSetupDiagnosticSeverity = "error" | "warning";

export interface FirehorseSetupDiagnostic {
  readonly code: string;
  readonly severity: FirehorseSetupDiagnosticSeverity;
  readonly message: string;
  readonly path?: string;
  readonly field?: string;
  readonly expected?: string;
  readonly actual?: string;
}

export class FirehorseSetupManifestError extends Error {
  readonly diagnostics: readonly FirehorseSetupDiagnostic[];

  constructor(diagnostics: readonly FirehorseSetupDiagnostic[], message?: string) {
    super(message ?? formatFirehorseSetupDiagnostics(diagnostics));
    this.name = "FirehorseSetupManifestError";
    this.diagnostics = diagnostics;
  }
}

/**
 * Git facts a caller collects with `rev-parse HEAD`, `merge-base --is-ancestor`
 * and `rev-list --count`. The staleness computation never shells out itself.
 */
export interface FirehorseGitFacts {
  readonly headCommit?: string;
  readonly recordedIsAncestorOfHead?: boolean;
  readonly commitsBehind?: number;
}

export type FirehorseIndexStaleness =
  | { readonly status: "no-index" }
  | { readonly status: "unknown" }
  | { readonly status: "current" }
  | { readonly status: "behind"; readonly commitsBehind?: number | undefined }
  | { readonly status: "diverged" };

/**
 * Compares the commit `/index` recorded against HEAD by ancestry, using only
 * the git facts supplied by the caller.
 */
export function computeFirehorseIndexStaleness(
  recordedCommit: string | undefined,
  git: FirehorseGitFacts = {},
): FirehorseIndexStaleness {
  if (!recordedCommit) return { status: "no-index" };
  if (!git.headCommit) return { status: "unknown" };
  if (commitsMatch(recordedCommit, git.headCommit)) return { status: "current" };
  if (git.recordedIsAncestorOfHead === undefined) return { status: "unknown" };
  if (!git.recordedIsAncestorOfHead) return { status: "diverged" };
  return { status: "behind", commitsBehind: git.commitsBehind };
}

export interface CheckFirehorseSetupOptions {
  readonly manifestContent?: string;
  readonly manifestPath?: string;
  readonly markerPaths?: readonly string[];
  readonly git?: FirehorseGitFacts;
}

export interface FirehorseSetupCheckResult {
  readonly enabled: boolean;
  readonly healthy: boolean;
  readonly manifest?: FirehorseSetupManifest;
  readonly manifestPath?: string;
  readonly markerPaths: readonly string[];
  readonly diagnostics: readonly FirehorseSetupDiagnostic[];
}

/**
 * Lift a manifest written against an older schema to the current one.
 *
 * Firehorse ships as a plugin, so manifests written by an earlier version are
 * in repositories this code has never seen. `firehorseSetupManifestSchema` is a
 * `strictObject` pinned to one `schemaVersion`, which means an unmigrated v2
 * manifest fails to parse rather than degrading — so the lift happens before
 * validation, never inside it.
 *
 * v2 to v3: `index.supermemory` is dropped. It was a boolean recording whether
 * the supermemory pass ran, and the engine it named no longer exists here
 * (D-183). Its value is not carried into `index.memory`: `false` means the pass
 * did not run, and `true` cannot be trusted, because #232 is the case where it
 * recorded a pass that had failed. Either way the honest v3 state is "no memory
 * pass has been recorded", which is `index.memory` absent.
 *
 * Returns the input untouched when it is not a JSON object, when it carries no
 * numeric `schemaVersion`, or when that version is already current. Malformed
 * input is the validator's problem to report, not this function's to guess at.
 */
/** The one schema version this migration knows how to bring forward. */
const MIGRATABLE_SETUP_MANIFEST_SCHEMA_VERSION = 2;

export function migrateFirehorseSetupManifest(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return parsed;

  const manifest = parsed as Record<string, unknown>;
  const version = manifest.schemaVersion;

  // Only v2 migrates. Anything already current or newer needs nothing, and a
  // v1 manifest predates the restructuring in 1ee8c25, which this function
  // does not reverse. Stamping v1 as current would hand the validator a v1
  // shape labelled v3 and it would report the wrong thing. Leave both alone
  // and let the validator speak for itself.
  if (version !== MIGRATABLE_SETUP_MANIFEST_SCHEMA_VERSION) return parsed;

  const migrated: Record<string, unknown> = { ...manifest };

  const index = migrated.index;
  if (typeof index === "object" && index !== null && !Array.isArray(index)) {
    const { supermemory: _dropped, ...rest } = index as Record<string, unknown>;
    migrated.index = rest;
  }

  migrated.schemaVersion = FIREHORSE_SETUP_MANIFEST_SCHEMA_VERSION;
  return migrated;
}

export function parseFirehorseSetupManifest(
  content: string,
  path = FIREHORSE_SETUP_MANIFEST_PATH,
): FirehorseSetupManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new FirehorseSetupManifestError([
      {
        code: "setup_manifest.json_parse",
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
        path,
      },
    ]);
  }

  const result = firehorseSetupManifestSchema.safeParse(migrateFirehorseSetupManifest(parsed));
  if (!result.success) {
    throw new FirehorseSetupManifestError(zodIssuesToSetupDiagnostics(result.error, path));
  }

  return result.data;
}

export function checkFirehorseSetup(
  options: CheckFirehorseSetupOptions,
): FirehorseSetupCheckResult {
  const markerPaths = options.markerPaths ?? [];
  const manifestPath = options.manifestPath ?? FIREHORSE_SETUP_MANIFEST_PATH;
  const enabled = options.manifestContent !== undefined || markerPaths.length > 0;

  if (!enabled) {
    return {
      enabled: false,
      healthy: true,
      markerPaths,
      diagnostics: [],
    };
  }

  if (options.manifestContent === undefined) {
    return {
      enabled: true,
      healthy: false,
      manifestPath,
      markerPaths,
      diagnostics: [
        {
          code: "setup_manifest.missing",
          severity: "warning",
          message: `no ${FIREHORSE_SETUP_MANIFEST_PATH} — run /firehorse:new-project`,
          path: manifestPath,
        },
      ],
    };
  }

  try {
    const manifest = parseFirehorseSetupManifest(options.manifestContent, manifestPath);
    const diagnostics = validateFirehorseSetupManifest(manifest, options.git);
    return {
      enabled: true,
      healthy: diagnostics.length === 0,
      manifest,
      manifestPath,
      markerPaths,
      diagnostics,
    };
  } catch (error) {
    if (error instanceof FirehorseSetupManifestError) {
      return {
        enabled: true,
        healthy: false,
        manifestPath,
        markerPaths,
        diagnostics: error.diagnostics,
      };
    }
    throw error;
  }
}

/**
 * Reports manifest state in the order the SessionStart hook reports it, so the
 * first diagnostic is the line the hook prints. State only — never conventions
 * or preferences (D-164).
 */
export function validateFirehorseSetupManifest(
  manifest: FirehorseSetupManifest,
  git: FirehorseGitFacts = {},
): FirehorseSetupDiagnostic[] {
  if (!manifest.setup?.mattPocockSkills) {
    return [
      {
        code: "setup.not_run",
        severity: "warning",
        message: "setup has not run — run /firehorse:new-project",
        field: "setup.mattPocockSkills",
      },
    ];
  }

  const staleness = computeFirehorseIndexStaleness(manifest.index?.commit, git);

  switch (staleness.status) {
    case "diverged":
      return [
        {
          code: "index.diverged",
          severity: "warning",
          message: "index was recorded on a different history line — run /firehorse:index",
          field: "index.commit",
        },
      ];
    case "behind":
      return [
        {
          code: "index.behind",
          severity: "warning",
          message: `index is ${staleness.commitsBehind ?? 0} commit${
            staleness.commitsBehind === 1 ? "" : "s"
          } behind HEAD — run /firehorse:index`,
          field: "index.commit",
        },
      ];
    case "no-index":
      return [
        {
          code: "index.missing",
          severity: "warning",
          message: "repo has not been indexed — run /firehorse:index",
          field: "index",
        },
      ];
    default:
      return [];
  }
}

export function formatFirehorseSetupDiagnostics(
  diagnostics: readonly FirehorseSetupDiagnostic[],
): string {
  return diagnostics
    .map((diagnostic) => {
      const location = [diagnostic.path, diagnostic.field ? `field ${diagnostic.field}` : undefined]
        .filter(Boolean)
        .join(" ");
      const values = [
        diagnostic.expected ? `expected ${diagnostic.expected}` : undefined,
        diagnostic.actual ? `actual ${diagnostic.actual}` : undefined,
      ]
        .filter(Boolean)
        .join(", ");
      return `${diagnostic.severity.toUpperCase()} ${diagnostic.code}${location ? ` (${location})` : ""}: ${diagnostic.message}${values ? ` (${values})` : ""}`;
    })
    .join("\n");
}

function commitsMatch(recorded: string, head: string): boolean {
  const shorter = Math.min(recorded.length, head.length);
  return recorded.slice(0, shorter) === head.slice(0, shorter);
}

function zodIssuesToSetupDiagnostics(error: z.ZodError, path: string): FirehorseSetupDiagnostic[] {
  return error.issues.map((issue) => ({
    code: `setup_manifest.${issue.code}`,
    severity: "error",
    message: issue.message,
    path,
    field: issue.path.map(String).join("."),
  }));
}
