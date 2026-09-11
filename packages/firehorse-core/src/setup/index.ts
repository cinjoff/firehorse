import { z } from "zod";

export const FIREHORSE_SETUP_MANIFEST_SCHEMA_VERSION = 2;
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
      supermemory: z.boolean().optional(),
    })
    .optional(),
  anchors: z
    .strictObject({
      design: z.boolean().optional(),
      codebase: z.array(nonEmptyStringSchema).optional(),
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

  const result = firehorseSetupManifestSchema.safeParse(parsed);
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
          message: `no ${FIREHORSE_SETUP_MANIFEST_PATH} — run /new-project`,
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
 * or preferences (D-145).
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
        message: "setup has not run — run /new-project",
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
          message: "index was recorded on a different history line — run /index",
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
          } behind HEAD — run /index`,
          field: "index.commit",
        },
      ];
    case "no-index":
      return [
        {
          code: "index.missing",
          severity: "warning",
          message: "repo has not been indexed — run /index",
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
