/**
 * Resolving `upstreamSkills` to exact invocations and paths at projection time.
 *
 * A definition names an upstream skill as `<plugin>` plus `<id>`. A mirror that
 * carried only those two names would leave every session searching the plugin
 * tree for the file. `upstreams.lock.json` already records each skill's path
 * relative to its plugin root, so the table goes into the mirror instead.
 */

/** The plugin-root layout the cache uses, stated once in the rendered table. */
export const UPSTREAM_PLUGIN_ROOT_PATTERN =
  "~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/";

/** The structural slice of `upstreams.lock.json` the resolver reads. */
export interface UpstreamLockSlice {
  readonly plugins: Readonly<
    Record<
      string,
      {
        readonly marketplace: string;
        readonly version: string;
        readonly skills: Readonly<
          Record<string, { readonly path: string; readonly modelInvocable?: boolean }>
        >;
      }
    >
  >;
}

export interface ResolvedUpstreamSkill {
  /** What the agent types or passes to the Skill tool: `<plugin>:<id>`. */
  readonly invocation: string;
  readonly plugin: string;
  readonly id: string;
  readonly marketplace: string;
  readonly version: string;
  /** Posix path to `SKILL.md`, relative to the plugin root. */
  readonly skillPath: string;
  /**
   * False when the skill sets `disable-model-invocation`. Such a skill cannot be
   * invoked by an agent at all: the workflow reads its `SKILL.md` and follows it
   * inline. Getting this wrong is how a step fails with "skill not found".
   */
  readonly modelInvocable: boolean;
}

/** Keys are `<plugin>:<id>`. */
export type UpstreamSkillResolutions = Readonly<Record<string, ResolvedUpstreamSkill>>;

export function resolveUpstreamSkills(lock: UpstreamLockSlice): UpstreamSkillResolutions {
  const resolutions: Record<string, ResolvedUpstreamSkill> = {};

  for (const [plugin, locked] of Object.entries(lock.plugins)) {
    for (const [id, skill] of Object.entries(locked.skills)) {
      const invocation = `${plugin}:${id}`;
      resolutions[invocation] = {
        invocation,
        plugin,
        id,
        marketplace: locked.marketplace,
        version: locked.version,
        skillPath: skill.path,
        modelInvocable: skill.modelInvocable ?? true,
      };
    }
  }

  return resolutions;
}

export interface RenderUpstreamSkillTableOptions {
  readonly references: readonly { readonly upstream: string; readonly id: string }[];
  readonly resolutions: UpstreamSkillResolutions;
}

/**
 * One row per reference, in the order the definition declared them. An
 * unresolved reference still gets a row saying so, because a silently dropped
 * row reads as "this workflow orchestrates nothing".
 */
export function renderUpstreamSkillTable(options: RenderUpstreamSkillTableOptions): string | null {
  if (options.references.length === 0) {
    return null;
  }

  const rows = options.references.map((reference) => {
    const key = `${reference.upstream}:${reference.id}`;
    const resolved = options.resolutions[key];
    if (!resolved) {
      return `| \`${key}\` | unresolved | run \`pnpm upstreams:check\` |`;
    }
    const how = resolved.modelInvocable
      ? `invoke \`${key}\``
      : "**read the file and follow it inline**";
    const location = `\`${resolved.marketplace}/${resolved.plugin}/${resolved.version}/${resolved.skillPath}\``;
    return `| \`${key}\` | ${how} | ${location} |`;
  });

  return [
    "**Resolved upstream skills.** How to reach each one, and where its text lives, so",
    `neither costs a search. The plugin root is \`${UPSTREAM_PLUGIN_ROOT_PATTERN}\`.`,
    "",
    "A skill marked **read the file and follow it inline** sets",
    "`disable-model-invocation`, which means only a human can invoke it by name.",
    'Trying to invoke one fails with "skill not found"; read its `SKILL.md` at the',
    "path below and carry out its steps yourself.",
    "",
    "| Skill | How to reach it | `SKILL.md` under the plugin cache |",
    "| ----- | --------------- | --------------------------------- |",
    ...rows,
  ].join("\n");
}
