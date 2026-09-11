import {
  installedUpstreamSkillKeys,
  lockedUpstreamSkillKeys,
  upstreamSkillKey,
} from "./lockfile.js";
import { workflowsReferencing } from "./references.js";
import type {
  DeclaredUpstreamPlugin,
  InstalledUpstreamPlugin,
  InstalledUpstreamSkill,
  UpstreamComparisonBasis,
  UpstreamDriftFinding,
  UpstreamDriftReport,
  UpstreamSkillUsage,
  UpstreamsLockfile,
} from "./types.js";

export interface DiffUpstreamsInput {
  /** Plugins declared in the plugin and marketplace manifests. */
  readonly declared: readonly DeclaredUpstreamPlugin[];
  readonly lockfile: UpstreamsLockfile;
  /**
   * Plugins read from `~/.claude/plugins/`, or `null` when that directory is
   * absent — on CI it is, and absence is not drift.
   */
  readonly installed: readonly InstalledUpstreamPlugin[] | null;
  readonly usages: readonly UpstreamSkillUsage[];
}

function byAscii(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function finish(
  basis: UpstreamComparisonBasis,
  findings: readonly UpstreamDriftFinding[],
): UpstreamDriftReport {
  const breaking = findings.filter((finding) => finding.severity === "breaking");
  const advisory = findings.filter((finding) => finding.severity === "advisory");
  return { basis, findings, breaking, advisory, ok: breaking.length === 0 };
}

/**
 * Compare the recorded baseline against what is installed, and report impact:
 * a vanished skill that a workflow references is breaking and names the workflow.
 *
 * Pure over supplied data — the caller reads the manifests, the lockfile and
 * `~/.claude/plugins/`.
 */
export function diffUpstreams(input: DiffUpstreamsInput): UpstreamDriftReport {
  const findings: UpstreamDriftFinding[] = [];
  const declaredNames = new Set(input.declared.map((plugin) => plugin.name));
  const lockedNames = Object.keys(input.lockfile.plugins).sort(byAscii);

  for (const name of lockedNames) {
    if (!declaredNames.has(name)) {
      findings.push({
        code: "upstreams.lockfile_undeclared_plugin",
        severity: "breaking",
        plugin: name,
        message: `upstreams.lock.json records plugin '${name}', which is no longer declared as a dependency. The lockfile is stale; run 'pnpm upstreams:check --write'.`,
      });
    }
  }

  if (input.installed === null) {
    return finish("lockfile-only", [
      ...findings,
      ...checkUpstreamSkillUsages({
        usages: input.usages,
        known: lockedUpstreamSkillKeys(input.lockfile),
        basis: "lockfile-only",
      }),
    ]);
  }

  const installedByName = new Map(input.installed.map((plugin) => [plugin.name, plugin] as const));

  for (const declared of [...input.declared].sort((a, b) => byAscii(a.name, b.name))) {
    const installed = installedByName.get(declared.name);
    if (!installed) {
      findings.push({
        code: "upstreams.plugin_not_installed",
        severity: "breaking",
        plugin: declared.name,
        message: `Declared plugin '${declared.name}' (marketplace '${declared.marketplace}') is not installed under ~/.claude/plugins/. Install it, or drop the dependency.`,
      });
      continue;
    }

    const locked = input.lockfile.plugins[declared.name];
    if (!locked) {
      findings.push({
        code: "upstreams.lockfile_missing_plugin",
        severity: "breaking",
        plugin: declared.name,
        message: `Declared plugin '${declared.name}' is installed at version ${installed.version} but upstreams.lock.json has no entry for it. The lockfile is stale; run 'pnpm upstreams:check --write'.`,
      });
      continue;
    }

    if (locked.version !== installed.version) {
      findings.push({
        code: "upstreams.plugin_version_changed",
        severity: "advisory",
        plugin: declared.name,
        message: `Plugin '${declared.name}' version moved ${locked.version} -> ${installed.version}.`,
      });
    }

    if (locked.marketplace !== installed.marketplace) {
      findings.push({
        code: "upstreams.plugin_marketplace_changed",
        severity: "advisory",
        plugin: declared.name,
        message: `Plugin '${declared.name}' marketplace moved '${locked.marketplace}' -> '${installed.marketplace}'.`,
      });
    }

    findings.push(
      ...diffPluginSkills(declared.name, locked.skills, installed.skills, input.usages),
    );
  }

  // A skill that vanished out of the lockfile is already reported above, with its
  // broken workflows named; do not report the same key twice.
  const alreadyReported = new Set(
    findings
      .filter((finding) => finding.code === "upstreams.skill_vanished_referenced")
      .map((finding) => upstreamSkillKey(finding.plugin ?? "", finding.skill ?? "")),
  );

  return finish("installed", [
    ...findings,
    ...checkUpstreamSkillUsages({
      usages: input.usages.filter((usage) => !alreadyReported.has(usage.key)),
      known: installedUpstreamSkillKeys(input.installed),
      basis: "installed",
    }),
  ]);
}

function diffPluginSkills(
  plugin: string,
  locked: Readonly<Record<string, { readonly sha256: string; readonly path: string }>>,
  installed: readonly InstalledUpstreamSkill[],
  usages: readonly UpstreamSkillUsage[],
): UpstreamDriftFinding[] {
  const findings: UpstreamDriftFinding[] = [];
  const installedByKey = new Map(installed.map((skill) => [skill.key, skill] as const));

  for (const [key, baseline] of Object.entries(locked).sort(([a], [b]) => byAscii(a, b))) {
    const present = installedByKey.get(key);
    const reference = upstreamSkillKey(plugin, key);
    const affectedWorkflows = workflowsReferencing(usages, reference);

    if (!present) {
      if (affectedWorkflows.length > 0) {
        findings.push({
          code: "upstreams.skill_vanished_referenced",
          severity: "breaking",
          plugin,
          skill: key,
          affectedWorkflows,
          message: `Skill '${reference}' is recorded in upstreams.lock.json but absent from the installed plugin. Broken workflows: ${affectedWorkflows.join(", ")}.`,
        });
      } else {
        findings.push({
          code: "upstreams.skill_vanished",
          severity: "advisory",
          plugin,
          skill: key,
          message: `Skill '${reference}' vanished from the installed plugin. No definition references it.`,
        });
      }
      continue;
    }

    if (present.sha256 !== baseline.sha256) {
      findings.push({
        code: "upstreams.skill_hash_changed",
        severity: "advisory",
        plugin,
        skill: key,
        affectedWorkflows,
        message:
          `Skill '${reference}' changed content (${baseline.sha256.slice(0, 12)} -> ${present.sha256.slice(0, 12)}).` +
          (affectedWorkflows.length > 0 ? ` Referenced by: ${affectedWorkflows.join(", ")}.` : ""),
      });
    }
  }

  for (const skill of [...installed].sort((a, b) => byAscii(a.key, b.key))) {
    if (locked[skill.key]) {
      continue;
    }
    findings.push({
      code: "upstreams.skill_added",
      severity: "advisory",
      plugin,
      skill: skill.key,
      message: `Skill '${upstreamSkillKey(plugin, skill.key)}' appeared in the installed plugin and is not in upstreams.lock.json.`,
    });
  }

  return findings;
}

export interface CheckUpstreamSkillUsagesInput {
  readonly usages: readonly UpstreamSkillUsage[];
  /** `<plugin>:<skill>` keys a reference may resolve to. */
  readonly known: ReadonlySet<string>;
  readonly basis: UpstreamComparisonBasis;
}

/**
 * Every `upstreamSkills` entry must resolve. Against on-disk truth when
 * `~/.claude/plugins/` exists, against the lockfile alone when it does not.
 */
export function checkUpstreamSkillUsages(
  input: CheckUpstreamSkillUsagesInput,
): readonly UpstreamDriftFinding[] {
  const unresolved = new Map<string, string[]>();

  for (const usage of input.usages) {
    if (input.known.has(usage.key)) {
      continue;
    }
    const workflows = unresolved.get(usage.key) ?? [];
    if (!workflows.includes(usage.workflowId)) {
      workflows.push(usage.workflowId);
    }
    unresolved.set(usage.key, workflows);
  }

  const against =
    input.basis === "installed"
      ? "the plugins installed under ~/.claude/plugins/"
      : "upstreams.lock.json (~/.claude/plugins/ was not read)";

  return [...unresolved.entries()]
    .sort(([a], [b]) => byAscii(a, b))
    .map(([key, workflows]) => {
      const affectedWorkflows = [...workflows].sort(byAscii);
      return {
        code: "upstreams.reference_unresolved",
        severity: "breaking" as const,
        skill: key,
        affectedWorkflows,
        message: `Upstream skill '${key}' does not resolve against ${against}. Broken workflows: ${affectedWorkflows.join(", ")}.`,
      };
    });
}

/** Human-readable report lines, breaking findings first. */
export function formatUpstreamDriftReport(report: UpstreamDriftReport): readonly string[] {
  return [...report.breaking, ...report.advisory].map(
    (finding) =>
      `${finding.severity === "breaking" ? "breaking" : "advisory"} ${finding.code}: ${finding.message}`,
  );
}
