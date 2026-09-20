// What the scan judges. A candidate is a repo you starred, a repo the
// discovery leg found, or a named idea with no repo behind it at all. The
// ledger, the gate and both reports work on this shape rather than on a
// GitHub repo, which is the only reason a topic can be muted like a repo.

export type CandidateKind = "repo" | "topic";

export interface Candidate {
  /** Stable, lowercased key. The mute index and the ledger key on this. */
  readonly id: string;
  readonly kind: CandidateKind;
  /** Display form, which keeps the source's own casing. */
  readonly name: string;
  readonly url: string | null;
  readonly summary: string;
  /** Why the discovery leg surfaced it. Null for a star. */
  readonly signal: string | null;
}

export interface RepoShape {
  readonly skillCount: number;
  readonly largestSkillBytes: number;
  readonly benchmarkPaths: readonly string[];
  readonly hasPluginManifest: boolean;
  /** The tree call hit GitHub's cap, so the counts above are floors. */
  readonly truncated?: boolean;
}

export interface Verdict {
  readonly candidate: Candidate;
  /** Null for a topic, which has no tree to read. */
  readonly shape: RepoShape | null;
  readonly relevance: number;
  readonly value: number;
  readonly overlap: number;
  readonly kind: string;
  readonly workflow: string;
  readonly workflowConfidence: number;
  readonly measured: number;
  readonly shortlisted: boolean;
  readonly filedAs: number | null;
}

// The gate. Set by reading the first full pass over 77 stars on 2026-09-20,
// where it admitted 12 and the bottom 40 scored under 0.8 value at under 0.05
// relevance. Not derived from anything the model reports about itself.
export const RELEVANCE_THRESHOLD = 0.8;
export const VALUE_THRESHOLD = 2.5;
export const OVERLAP_CEILING = 0.5;

// A candidate can clear the gate on value alone when relevance reads low
// because the tool is general-purpose rather than agent-specific. GEPA and
// gitingest both landed here on the first pass, and both were worth a look.
export const HIGH_VALUE_OVERRIDE = 2.75;
export const OVERRIDE_RELEVANCE_FLOOR = 0.55;

/**
 * The gate. A candidate passes on the main rule, or on the override for a
 * general-purpose tool whose value reads high while relevance reads low.
 * Overlap vetoes both: a duplicate of something built is not worth an hour.
 */
export function clearsGate(relevance: number, value: number, overlap: number): boolean {
  if (overlap >= OVERLAP_CEILING) return false;
  if (relevance >= RELEVANCE_THRESHOLD && value >= VALUE_THRESHOLD) return true;
  return value >= HIGH_VALUE_OVERRIDE && relevance >= OVERRIDE_RELEVANCE_FLOOR;
}

export function repoCandidate(repo: {
  fullName: string;
  description: string | null;
  signal?: string | null;
}): Candidate {
  return {
    id: `repo:${repo.fullName.toLowerCase()}`,
    kind: "repo",
    name: repo.fullName,
    url: `https://github.com/${repo.fullName}`,
    summary: repo.description ?? "",
    signal: repo.signal ?? null,
  };
}

export function topicCandidate(topic: {
  name: string;
  summary: string;
  signal?: string | null;
}): Candidate {
  return {
    id: `topic:${slug(topic.name)}`,
    kind: "topic",
    name: topic.name,
    url: null,
    summary: topic.summary,
    signal: topic.signal ?? null,
  };
}

/**
 * Lowercase, strip anything that is not a word character, collapse runs to a
 * single hyphen. "Loop Engineering" and "loop  engineering!" have to land on
 * one id or the same idea gets muted twice.
 */
function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
