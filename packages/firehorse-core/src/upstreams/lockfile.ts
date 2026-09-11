import { createHash } from "node:crypto";

import {
  OutdatedUpstreamsLockfileError,
  UPSTREAMS_LOCK_SCHEMA_VERSION,
  UpstreamsLockfileError,
  upstreamsLockfileSchema,
  type InstalledUpstreamPlugin,
  type LockedUpstreamPlugin,
  type LockedUpstreamSkill,
  type UpstreamsLockfile,
} from "./types.js";

/**
 * Hash a whole `SKILL.md`, frontmatter included: `description` decides whether a
 * skill is invoked at all, so a description rewrite is a behaviour change.
 * CRLF is normalised to LF; nothing else is trimmed.
 */
export function hashUpstreamSkillSource(content: string): string {
  return createHash("sha256").update(content.replaceAll("\r\n", "\n"), "utf8").digest("hex");
}

/** `<upstream>:<id>`, the key an `upstreamSkills` entry resolves by. */
export function upstreamSkillKey(plugin: string, skill: string): string {
  return `${plugin}:${skill}`;
}

function byAscii(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortedEntries<T>(record: Readonly<Record<string, T>>): [string, T][] {
  return Object.entries(record).sort(([a], [b]) => byAscii(a, b));
}

export interface BuildUpstreamsLockfileOptions {
  readonly plugins: readonly InstalledUpstreamPlugin[];
  /** ISO timestamp; `--write` supplies it, a comparison-only build omits it. */
  readonly generatedAt?: string;
}

export function buildUpstreamsLockfile(options: BuildUpstreamsLockfileOptions): UpstreamsLockfile {
  const plugins: Record<string, LockedUpstreamPlugin> = {};

  for (const plugin of [...options.plugins].sort((a, b) => byAscii(a.name, b.name))) {
    const skills: Record<string, LockedUpstreamSkill> = {};
    for (const skill of [...plugin.skills].sort((a, b) => byAscii(a.key, b.key))) {
      const claimed = skills[skill.key];
      if (claimed) {
        throw new UpstreamsLockfileError(
          `Plugin '${plugin.name}' exposes skill key '${skill.key}' twice ('${claimed.path}' and '${skill.path}').`,
        );
      }
      skills[skill.key] = {
        path: skill.path,
        sha256: skill.sha256,
        nameSource: skill.nameSource,
        modelInvocable: skill.modelInvocable,
      };
    }
    plugins[plugin.name] = {
      marketplace: plugin.marketplace,
      version: plugin.version,
      skills,
    };
  }

  return {
    schemaVersion: UPSTREAMS_LOCK_SCHEMA_VERSION,
    ...(options.generatedAt ? { generatedAt: options.generatedAt } : {}),
    plugins,
  };
}

/**
 * Serialise with `plugins` by name and `skills` by key, both ASCII-sorted, so a
 * real change is the only thing that ever shows in a diff.
 */
export function serialiseUpstreamsLockfile(lock: UpstreamsLockfile): string {
  const plugins: Record<string, unknown> = {};
  for (const [name, plugin] of sortedEntries(lock.plugins)) {
    const skills: Record<string, unknown> = {};
    for (const [key, skill] of sortedEntries(plugin.skills)) {
      skills[key] = {
        path: skill.path,
        sha256: skill.sha256,
        nameSource: skill.nameSource,
        modelInvocable: skill.modelInvocable,
      };
    }
    plugins[name] = {
      marketplace: plugin.marketplace,
      version: plugin.version,
      skills,
    };
  }

  const ordered = {
    schemaVersion: lock.schemaVersion,
    ...(lock.generatedAt ? { generatedAt: lock.generatedAt } : {}),
    plugins,
  };

  return `${JSON.stringify(ordered, null, 2)}\n`;
}

export function parseUpstreamsLockfile(content: string): UpstreamsLockfile {
  let json: unknown;
  try {
    json = JSON.parse(content) as unknown;
  } catch (error) {
    throw new UpstreamsLockfileError(
      `upstreams.lock.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const recordedVersion =
    typeof json === "object" && json !== null
      ? (json as { schemaVersion?: unknown }).schemaVersion
      : undefined;
  if (typeof recordedVersion === "number" && recordedVersion < UPSTREAMS_LOCK_SCHEMA_VERSION) {
    throw new OutdatedUpstreamsLockfileError(recordedVersion);
  }

  const result = upstreamsLockfileSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("\n");
    throw new UpstreamsLockfileError(
      `upstreams.lock.json does not match schema version ${UPSTREAMS_LOCK_SCHEMA_VERSION}:\n${issues}`,
    );
  }
  return result.data;
}

/** Skill keys the lockfile records, as `<plugin>:<skill>`. */
export function lockedUpstreamSkillKeys(lock: UpstreamsLockfile): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const [plugin, entry] of Object.entries(lock.plugins)) {
    for (const skill of Object.keys(entry.skills)) {
      keys.add(upstreamSkillKey(plugin, skill));
    }
  }
  return keys;
}

/** Skill keys actually present on disk, as `<plugin>:<skill>`. */
export function installedUpstreamSkillKeys(
  plugins: readonly InstalledUpstreamPlugin[],
): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const plugin of plugins) {
    for (const skill of plugin.skills) {
      keys.add(upstreamSkillKey(plugin.name, skill.key));
    }
  }
  return keys;
}
