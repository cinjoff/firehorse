import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";

const MANIFEST_RELATIVE_PATH = ".firehorse/manifest.json";
const FIREHORSE_MARKER_PATHS = [".firehorse"];
const SETUP_CHECK_COMMAND =
  "Run the firehorse-setup skill with --check for a read-only setup report.";

type NotifyType = "info" | "success" | "warning" | "error";

interface ExtensionAPI {
  on(
    event: "session_start",
    handler: (
      event: { reason?: string },
      ctx: { cwd?: string; ui?: { notify(message: string, type?: NotifyType): void } },
    ) => void | Promise<void>,
  ): void;
}

interface Diagnostic {
  code: string;
  message: string;
  field?: string;
}

interface SetupRoot {
  root: string;
  manifestPath?: string;
  markerPaths: string[];
}

interface Manifest {
  project: { name: string };
  github: { owner: string; repo: string };
}

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function shouldSkip(): boolean {
  return (
    isTruthy(process.env.FIREHORSE_SKIP_SETUP_CHECK) ||
    isTruthy(process.env.FIREHORSE_DISABLE_SETUP_CHECK) ||
    isTruthy(process.env.CI)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringAt(value: Record<string, unknown>, path: readonly string[]): string | undefined {
  let current: unknown = value;
  for (const part of path) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return typeof current === "string" && current.trim() ? current : undefined;
}

function arrayAt(value: Record<string, unknown>, path: readonly string[]): unknown[] | undefined {
  let current: unknown = value;
  for (const part of path) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return Array.isArray(current) ? current : undefined;
}

function addMissingString(
  diagnostics: Diagnostic[],
  value: Record<string, unknown>,
  field: string,
): string | undefined {
  const result = stringAt(value, field.split("."));
  if (!result) {
    diagnostics.push({
      code: "setup_manifest.field_required",
      message: `Missing required non-empty string field '${field}'.`,
      field,
    });
  }
  return result;
}

function validateNamedIdArray(
  diagnostics: Diagnostic[],
  value: Record<string, unknown>,
  field: string,
): void {
  const items = arrayAt(value, field.split("."));
  if (!items?.length) {
    diagnostics.push({
      code: "setup_manifest.array_required",
      message: `Missing required non-empty array '${field}'.`,
      field,
    });
    return;
  }

  const names = new Set<string>();
  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (!isRecord(item)) {
      diagnostics.push({
        code: "setup_manifest.object_required",
        message: `Expected '${field}[${index}]' to be an object with name and id.`,
        field,
      });
      continue;
    }

    const name = stringAt(item, ["name"]);
    const id = stringAt(item, ["id"]);
    if (!name || !id) {
      diagnostics.push({
        code: "setup_manifest.named_id_required",
        message: `Expected '${field}[${index}]' to include non-empty name and id strings.`,
        field,
      });
      continue;
    }

    if (names.has(name) || ids.has(id)) {
      diagnostics.push({
        code: "setup_manifest.duplicate_named_id",
        message: `Duplicate name or id found in '${field}'.`,
        field,
      });
    }
    names.add(name);
    ids.add(id);
  }
}

function validateStringArray(
  diagnostics: Diagnostic[],
  value: Record<string, unknown>,
  field: string,
): void {
  const items = arrayAt(value, field.split("."));
  if (!items?.length) {
    diagnostics.push({
      code: "setup_manifest.array_required",
      message: `Missing required non-empty array '${field}'.`,
      field,
    });
    return;
  }

  const seen = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (typeof item !== "string" || !item.trim()) {
      diagnostics.push({
        code: "setup_manifest.string_required",
        message: `Expected '${field}[${index}]' to be a non-empty string.`,
        field,
      });
      continue;
    }
    if (seen.has(item)) {
      diagnostics.push({
        code: "setup_manifest.duplicate_label",
        message: `Duplicate label '${item}' found in '${field}'.`,
        field,
      });
    }
    seen.add(item);
  }
}

function parseManifest(path: string): { manifest?: Manifest; diagnostics: Diagnostic[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return {
      diagnostics: [
        {
          code: "setup_manifest.json_parse",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }

  if (!isRecord(parsed)) {
    return {
      diagnostics: [
        {
          code: "setup_manifest.object_required",
          message: "Firehorse setup manifest must be a JSON object.",
        },
      ],
    };
  }

  const diagnostics: Diagnostic[] = [];
  if (parsed.schemaVersion !== 1) {
    diagnostics.push({
      code: "setup_manifest.schema_version",
      message: "Expected schemaVersion: 1.",
      field: "schemaVersion",
    });
  }

  const projectName = addMissingString(diagnostics, parsed, "project.name");
  const owner = addMissingString(diagnostics, parsed, "github.owner");
  const repo = addMissingString(diagnostics, parsed, "github.repo");
  addMissingString(diagnostics, parsed, "tracker.project.name");
  addMissingString(diagnostics, parsed, "tracker.project.id");
  addMissingString(diagnostics, parsed, "tracker.status.field.name");
  addMissingString(diagnostics, parsed, "tracker.status.field.id");
  validateNamedIdArray(diagnostics, parsed, "tracker.status.options");
  validateStringArray(diagnostics, parsed, "labels.vocabulary");

  const defaultMode = stringAt(parsed, ["safeApply", "defaultMode"]);
  if (defaultMode !== "read-only") {
    diagnostics.push({
      code: "setup_manifest.safe_apply_default",
      message: "safeApply.defaultMode must be 'read-only'.",
      field: "safeApply.defaultMode",
    });
  }

  const mutationPolicy = stringAt(parsed, ["safeApply", "mutationPolicy"]);
  if (mutationPolicy !== "never" && mutationPolicy !== "explicit-operator-approval") {
    diagnostics.push({
      code: "setup_manifest.safe_apply_policy",
      message: "safeApply.mutationPolicy must be 'never' or 'explicit-operator-approval'.",
      field: "safeApply.mutationPolicy",
    });
  }

  const manifest =
    projectName && owner && repo
      ? { project: { name: projectName }, github: { owner, repo } }
      : undefined;

  return manifest ? { manifest, diagnostics } : { diagnostics };
}

function findSetupRoot(start: string): SetupRoot | undefined {
  let current = resolve(start);
  const root = parse(current).root;

  while (true) {
    const manifestPath = join(current, MANIFEST_RELATIVE_PATH);
    const markerPaths = FIREHORSE_MARKER_PATHS.map((marker) => join(current, marker)).filter(
      (path) => existsSync(path),
    );
    if (existsSync(manifestPath)) {
      return { root: current, manifestPath, markerPaths };
    }
    if (markerPaths.length > 0) {
      return { root: current, markerPaths };
    }
    if (current === root) return undefined;
    current = dirname(current);
  }
}

function findGitMarker(start: string): string | undefined {
  let current = resolve(start);
  const root = parse(current).root;

  while (true) {
    const marker = join(current, ".git");
    if (existsSync(marker)) return marker;
    if (current === root) return undefined;
    current = dirname(current);
  }
}

function gitDirFromMarker(marker: string): string | undefined {
  const stats = statSync(marker);
  if (stats.isDirectory()) return marker;
  if (!stats.isFile()) return undefined;

  const content = readFileSync(marker, "utf8").trim();
  const match = content.match(/^gitdir:\s*(.+)$/);
  const gitDir = match?.[1]?.trim();
  return gitDir ? resolve(dirname(marker), gitDir) : undefined;
}

function gitConfigPaths(marker: string): string[] {
  const gitDir = gitDirFromMarker(marker);
  if (!gitDir) return [];

  const paths = [join(gitDir, "config")];
  const commonDirFile = join(gitDir, "commondir");
  if (existsSync(commonDirFile)) {
    const commonDir = readFileSync(commonDirFile, "utf8").trim();
    if (commonDir) paths.push(join(resolve(gitDir, commonDir), "config"));
  }

  return [...new Set(paths)].filter((path) => existsSync(path));
}

function parseGitHubRemote(url: string): { owner: string; repo: string } | undefined {
  const normalized = url.trim().replace(/^git\+/, "");
  const patterns = [
    /^git@github\.com:([^/]+)\/([^/#?]+)$/,
    /^ssh:\/\/git@github\.com[:/]([^/]+)\/([^/#?]+)$/,
    /^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)$/,
    /^github\.com\/([^/]+)\/([^/#?]+)$/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const owner = match?.[1]?.trim();
    const repo = match?.[2]?.replace(/\.git$/, "").trim();
    if (owner && repo) return { owner, repo };
  }

  return undefined;
}

function observedGitHubRepo(cwd: string): { owner: string; repo: string } | undefined {
  const marker = findGitMarker(cwd);
  if (!marker) return undefined;

  const remotes = gitConfigPaths(marker).flatMap((path) => {
    const urls: Array<{ name: string; url: string }> = [];
    let remoteName: string | undefined;
    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      const section = line.match(/^\[remote\s+"(.+)"\]$/);
      if (section) {
        remoteName = section[1];
        continue;
      }
      if (line.startsWith("[")) remoteName = undefined;
      const url = line.match(/^url\s*=\s*(.+)$/);
      if (remoteName && url?.[1]) urls.push({ name: remoteName, url: url[1].trim() });
    }
    return urls;
  });

  const selected =
    remotes.find((remote) => remote.name === "origin" && parseGitHubRemote(remote.url)) ??
    remotes.find((remote) => parseGitHubRemote(remote.url));
  return selected ? parseGitHubRemote(selected.url) : undefined;
}

function localDriftDiagnostics(manifest: Manifest, cwd: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const observedRepo = observedGitHubRepo(cwd);
  if (observedRepo) {
    if (observedRepo.owner !== manifest.github.owner) {
      diagnostics.push({
        code: "setup_manifest.github_owner_drift",
        message: `Manifest GitHub owner '${manifest.github.owner}' differs from observed remote owner '${observedRepo.owner}'.`,
        field: "github.owner",
      });
    }
    if (observedRepo.repo !== manifest.github.repo) {
      diagnostics.push({
        code: "setup_manifest.github_repo_drift",
        message: `Manifest GitHub repo '${manifest.github.repo}' differs from observed remote repo '${observedRepo.repo}'.`,
        field: "github.repo",
      });
    }
  }

  const envProject =
    process.env.FIREHORSE_PROJECT_NAME?.trim() ||
    process.env.PI_MEM_PROJECT?.trim() ||
    process.env.CLAUDE_MEM_PROJECT?.trim();
  if (envProject && envProject !== manifest.project.name) {
    diagnostics.push({
      code: "setup_manifest.project_name_drift",
      message: `Manifest project name '${manifest.project.name}' differs from observed project '${envProject}'.`,
      field: "project.name",
    });
  }

  return diagnostics;
}

function formatDiagnostics(root: SetupRoot, diagnostics: readonly Diagnostic[]): string {
  const lines = diagnostics.map(
    (diagnostic) =>
      `- ${diagnostic.code}${diagnostic.field ? ` (${diagnostic.field})` : ""}: ${diagnostic.message}`,
  );
  return [
    `Firehorse setup check found ${diagnostics.length} actionable gap${diagnostics.length === 1 ? "" : "s"} in ${root.root}.`,
    ...lines,
    "This session-start check is read-only; it did not mutate GitHub, load prompts, execute workflows, or start agents.",
    SETUP_CHECK_COMMAND,
  ].join("\n");
}

function setupCheckMessage(cwd: string): string | undefined {
  const root = findSetupRoot(cwd);
  if (!root) return undefined;

  if (!root.manifestPath) {
    return formatDiagnostics(root, [
      {
        code: "setup_manifest.missing",
        message: `${MANIFEST_RELATIVE_PATH} is missing even though Firehorse project markers were found.`,
      },
    ]);
  }

  const { manifest, diagnostics } = parseManifest(root.manifestPath);
  if (manifest) diagnostics.push(...localDriftDiagnostics(manifest, root.root));
  if (diagnostics.length === 0) return undefined;

  return formatDiagnostics(root, diagnostics);
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (event, ctx) => {
    if (event.reason === "reload" || shouldSkip()) return;

    try {
      const message = setupCheckMessage(ctx.cwd ?? process.cwd());
      if (message) ctx.ui?.notify(message, "warning");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui?.notify(`Firehorse setup check failed read-only: ${message}`, "warning");
    }
  });
}
