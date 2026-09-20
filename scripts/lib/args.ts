// Argument parsing for the upstream scan, kept apart from the pass so the
// documented interface can be tested without a network or an API key. Every
// flag the workflow definition advertises is parsed here, and a flag that is
// documented but absent from this file is a bug rather than a no-op.
import { DISCOVERY_PATH } from "./discovery-io.js";

export interface ScanArgs {
  readonly all: boolean;
  readonly record: boolean;
  /** Path to the discovery file, or null when the pass judges stars alone. */
  readonly discovered: string | null;
  readonly repos: readonly string[];
  readonly mute: readonly string[];
  readonly unmute: readonly string[];
}

export function parseArgs(argv: readonly string[]): ScanArgs {
  // --skip-discovery wins over --discovered. Honouring both halfway would run
  // a sweep the caller asked to skip.
  const skipDiscovery = argv.includes("--skip-discovery");
  const discoveredIndex = argv.indexOf("--discovered");
  const explicitPath = discoveredIndex === -1 ? undefined : argv[discoveredIndex + 1];

  return {
    all: argv.includes("--all"),
    record: argv.includes("--record"),
    discovered:
      skipDiscovery || discoveredIndex === -1
        ? null
        : explicitPath && !explicitPath.startsWith("--")
          ? explicitPath
          : DISCOVERY_PATH,
    repos: flagValues(argv, "--repo").map(repoSlug).filter((name): name is string => name !== null),
    mute: flagValues(argv, "--mute"),
    unmute: flagValues(argv, "--unmute"),
  };
}

/**
 * Every value following each occurrence of `flag`, stopping at the next flag.
 *
 * Both spellings work, because both are documented: `--mute a b` as the help
 * text writes it, and `--mute a --mute b` as the workflow's step 6 writes it.
 */
function flagValues(argv: readonly string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== flag) continue;
    for (let j = i + 1; j < argv.length; j += 1) {
      const value = argv[j];
      if (value === undefined || value.startsWith("--")) break;
      values.push(value.trim());
    }
  }
  return values;
}

/** Accepts a full URL as well as owner/name, since a URL is what gets pasted. */
function repoSlug(raw: string): string | null {
  const match = /(?:github\.com\/)?([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/.exec(raw.trim());
  return match?.[1] ?? null;
}
