// Reads what the discovery leg found. `/last30days` is a skill, so no script
// can invoke it: the workflow runs the sweep, writes this file, and the scan
// judges its contents beside the stars. Keeping the boundary at a file is what
// lets the scan be tested without a network.
import { readFile } from "node:fs/promises";

import { repoCandidate, topicCandidate, type Candidate } from "./candidates.js";

export const DISCOVERY_PATH = ".firehorse/local/upstream-scan/discovered.json";

const REPO_SLUG = /^[\w.-]+\/[\w.-]+$/;

/**
 * Validate a discovery file into candidates.
 *
 * Every failure names the item's index, because the file is written by a model
 * and "invalid input" gives it nothing to correct. An absent `items` array is
 * an error rather than an empty run: a broken file and a quiet one look the
 * same downstream, and judging nothing by accident is the worse outcome.
 */
export function parseDiscovered(raw: unknown): Candidate[] {
  const source = raw as { items?: unknown };
  if (!Array.isArray(source?.items)) {
    throw new Error(
      `Discovery file has no "items" array. Expected { query, ranAt, items: [...] }.`,
    );
  }
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  source.items.forEach((item: unknown, index: number) => {
    const at = `item ${index}`;
    const entry = item as Record<string, unknown>;
    const kind = entry?.kind;
    if (kind !== "repo" && kind !== "topic") {
      throw new Error(`${at}: kind is ${JSON.stringify(kind)}, expected "repo" or "topic".`);
    }
    const name = entry.name;
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`${at}: name is missing.`);
    }
    const summary = typeof entry.summary === "string" ? entry.summary : "";
    const signal = typeof entry.signal === "string" ? entry.signal : null;

    if (kind === "repo" && !REPO_SLUG.test(name)) {
      throw new Error(`${at}: name "${name}" is not owner/name.`);
    }
    const candidate =
      kind === "repo"
        ? repoCandidate({ fullName: name, description: summary, signal })
        : topicCandidate({ name, summary, signal });

    // A sweep can surface the same repo from two sources. First mention wins.
    if (seen.has(candidate.id)) return;
    seen.add(candidate.id);
    candidates.push(candidate);
  });

  return candidates;
}

export async function readDiscovered(filePath: string): Promise<Candidate[]> {
  const raw = await readFile(filePath, "utf8");
  return parseDiscovered(JSON.parse(raw));
}
