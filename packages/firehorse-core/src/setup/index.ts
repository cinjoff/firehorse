import { z } from "zod";

export const FIREHORSE_SETUP_MANIFEST_SCHEMA_VERSION = 1;
export const FIREHORSE_SETUP_MANIFEST_PATH = ".firehorse/manifest.json";

const nonEmptyStringSchema = z.string().min(1);

const namedIdSchema = z
  .object({
    name: nonEmptyStringSchema,
    id: nonEmptyStringSchema,
  })
  .strict();

const uniqueNamedIdsSchema = z
  .array(namedIdSchema)
  .min(1)
  .superRefine((items, ctx) => {
    const names = new Set<string>();
    const ids = new Set<string>();

    for (const [index, item] of items.entries()) {
      if (names.has(item.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate option name '${item.name}'.`,
          path: [index, "name"],
        });
      }
      names.add(item.name);

      if (ids.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate option id '${item.id}'.`,
          path: [index, "id"],
        });
      }
      ids.add(item.id);
    }
  });

const uniqueLabelVocabularySchema = z
  .array(nonEmptyStringSchema)
  .min(1)
  .superRefine((labels, ctx) => {
    const seen = new Set<string>();
    for (const [index, label] of labels.entries()) {
      if (seen.has(label)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate label '${label}'.`,
          path: [index],
        });
      }
      seen.add(label);
    }
  });

export const firehorseSetupManifestSchema = z
  .object({
    schemaVersion: z.literal(FIREHORSE_SETUP_MANIFEST_SCHEMA_VERSION),
    project: z
      .object({
        name: nonEmptyStringSchema,
      })
      .strict(),
    github: z
      .object({
        owner: nonEmptyStringSchema,
        repo: nonEmptyStringSchema,
      })
      .strict(),
    memory: z
      .object({
        project: nonEmptyStringSchema,
      })
      .strict(),
    tracker: z
      .object({
        project: namedIdSchema,
        status: z
          .object({
            field: namedIdSchema,
            options: uniqueNamedIdsSchema,
          })
          .strict(),
      })
      .strict(),
    labels: z
      .object({
        vocabulary: uniqueLabelVocabularySchema,
      })
      .strict(),
    safeApply: z
      .object({
        defaultMode: z.literal("read-only"),
        mutationPolicy: z.enum(["never", "explicit-operator-approval"]),
      })
      .strict(),
  })
  .strict();

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

export interface ObservedFirehorseSetup {
  readonly projectName?: string;
  readonly github?: {
    readonly owner?: string;
    readonly repo?: string;
  };
  readonly memoryProject?: string;
  readonly tracker?: {
    readonly projectId?: string;
    readonly statusFieldId?: string;
    readonly statusOptions?: readonly NamedId[];
  };
  readonly labels?: readonly string[];
}

export interface NamedId {
  readonly name: string;
  readonly id: string;
}

export interface CheckFirehorseSetupOptions {
  readonly manifestContent?: string;
  readonly manifestPath?: string;
  readonly markerPaths?: readonly string[];
  readonly observed?: ObservedFirehorseSetup;
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
          message: `Firehorse project markers were found, but ${FIREHORSE_SETUP_MANIFEST_PATH} is missing. Run the setup check in read-only mode and commit a non-secret manifest before relying on session-start validation.`,
          path: manifestPath,
        },
      ],
    };
  }

  try {
    const manifest = parseFirehorseSetupManifest(options.manifestContent, manifestPath);
    const diagnostics = validateFirehorseSetupManifest(manifest, options.observed);
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

export function validateFirehorseSetupManifest(
  manifest: FirehorseSetupManifest,
  observed: ObservedFirehorseSetup = {},
): FirehorseSetupDiagnostic[] {
  const diagnostics: FirehorseSetupDiagnostic[] = [];

  compareObserved(diagnostics, "project.name", manifest.project.name, observed.projectName, {
    code: "setup_manifest.project_name_drift",
    message: "Firehorse project name differs from the observed project marker.",
  });
  compareObserved(diagnostics, "github.owner", manifest.github.owner, observed.github?.owner, {
    code: "setup_manifest.github_owner_drift",
    message: "GitHub owner differs from the observed repository owner.",
  });
  compareObserved(diagnostics, "github.repo", manifest.github.repo, observed.github?.repo, {
    code: "setup_manifest.github_repo_drift",
    message: "GitHub repo differs from the observed repository name.",
  });
  compareObserved(diagnostics, "memory.project", manifest.memory.project, observed.memoryProject, {
    code: "setup_manifest.memory_project_drift",
    message: "Memory project differs from the observed memory namespace.",
  });
  compareObserved(
    diagnostics,
    "tracker.project.id",
    manifest.tracker.project.id,
    observed.tracker?.projectId,
    {
      code: "setup_manifest.tracker_project_id_drift",
      message: "Tracker Project ID differs from the observed GitHub Project ID.",
    },
  );
  compareObserved(
    diagnostics,
    "tracker.status.field.id",
    manifest.tracker.status.field.id,
    observed.tracker?.statusFieldId,
    {
      code: "setup_manifest.status_field_id_drift",
      message: "Tracker Status field ID differs from the observed field ID.",
    },
  );

  if (observed.tracker?.statusOptions) {
    const observedOptions = new Map(
      observed.tracker.statusOptions.map((option) => [option.name, option.id] as const),
    );
    for (const option of manifest.tracker.status.options) {
      const observedId = observedOptions.get(option.name);
      if (!observedId) {
        diagnostics.push({
          code: "setup_manifest.status_option_missing",
          severity: "warning",
          message: `Tracker Status option '${option.name}' is recorded in the manifest but was not observed.`,
          field: "tracker.status.options",
          expected: option.name,
        });
      } else if (observedId !== option.id) {
        diagnostics.push({
          code: "setup_manifest.status_option_id_drift",
          severity: "warning",
          message: `Tracker Status option '${option.name}' has a different observed ID.`,
          field: "tracker.status.options",
          expected: option.id,
          actual: observedId,
        });
      }
    }
  }

  if (observed.labels) {
    const observedLabels = new Set(observed.labels);
    for (const label of manifest.labels.vocabulary) {
      if (!observedLabels.has(label)) {
        diagnostics.push({
          code: "setup_manifest.label_missing",
          severity: "warning",
          message: `Label '${label}' is recorded in the manifest but was not observed.`,
          field: "labels.vocabulary",
          expected: label,
        });
      }
    }
  }

  return diagnostics;
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

function zodIssuesToSetupDiagnostics(error: z.ZodError, path: string): FirehorseSetupDiagnostic[] {
  return error.issues.map((issue) => ({
    code: `setup_manifest.${issue.code}`,
    severity: "error",
    message: issue.message,
    path,
    field: issue.path.map(String).join("."),
  }));
}

function compareObserved(
  diagnostics: FirehorseSetupDiagnostic[],
  field: string,
  expected: string,
  actual: string | undefined,
  diagnostic: { readonly code: string; readonly message: string },
): void {
  if (actual === undefined || actual === expected) return;

  diagnostics.push({
    code: diagnostic.code,
    severity: "warning",
    message: diagnostic.message,
    field,
    expected,
    actual,
  });
}
