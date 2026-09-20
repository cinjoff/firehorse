// The committed record of what past scans judged, and of what you muted.
// It is committed on purpose: a fresh clone should agree about what is new,
// and a candidate you dismissed should stay dismissed on every machine.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CandidateKind } from "./candidates.js";

export const LEDGER_PATH = ".firehorse/upstream-scan.json";
export const LEDGER_SCHEMA_VERSION = 2;

export type Disposition = "shortlisted" | "below-gate" | "muted";

export interface LedgerEntry {
  readonly id: string;
  readonly kind: CandidateKind;
  readonly name: string;
  readonly judgedAt: string;
  readonly relevance: number;
  readonly value: number;
  readonly overlap: number;
  readonly disposition: Disposition;
}

export interface Ledger {
  readonly schemaVersion: number;
  readonly entries: readonly LedgerEntry[];
}

interface LedgerEntryV1 {
  readonly repo: string;
  readonly judgedAt: string;
  readonly relevance: number;
  readonly value: number;
  readonly overlap: number;
  readonly disposition: string;
}

const EMPTY: Ledger = { schemaVersion: LEDGER_SCHEMA_VERSION, entries: [] };

/**
 * Read whatever is on disk and return a v2 ledger. A missing file is an empty
 * ledger rather than an error, because the first run has nothing to read. A
 * schema from the future is an error, because guessing at it would silently
 * drop entries another version wrote.
 */
export function migrateLedger(raw: unknown): Ledger {
  if (raw === undefined || raw === null) return EMPTY;
  const source = raw as { schemaVersion?: unknown; entries?: unknown };
  const version = typeof source.schemaVersion === "number" ? source.schemaVersion : 1;
  if (version > LEDGER_SCHEMA_VERSION) {
    throw new Error(
      `${LEDGER_PATH} is schema ${version}, and this script understands ${LEDGER_SCHEMA_VERSION}. Update the script rather than the file.`,
    );
  }
  const entries = Array.isArray(source.entries) ? source.entries : [];
  if (version === LEDGER_SCHEMA_VERSION) {
    return { schemaVersion: LEDGER_SCHEMA_VERSION, entries: entries as LedgerEntry[] };
  }
  // v1 held a bare `repo` string and knew nothing about topics or muting.
  const migrated = (entries as LedgerEntryV1[]).map(
    (entry): LedgerEntry => ({
      id: `repo:${entry.repo.toLowerCase()}`,
      kind: "repo",
      name: entry.repo,
      judgedAt: entry.judgedAt,
      relevance: entry.relevance,
      value: entry.value,
      overlap: entry.overlap,
      disposition: entry.disposition === "muted" ? "muted" : (entry.disposition as Disposition),
    }),
  );
  return { schemaVersion: LEDGER_SCHEMA_VERSION, entries: migrated };
}

export function mutedIds(ledger: Ledger): Set<string> {
  return new Set(
    ledger.entries.filter((entry) => entry.disposition === "muted").map((entry) => entry.id),
  );
}

/**
 * Fold a pass's entries into the ones already recorded, keyed by id.
 *
 * A mute always wins. Muting is your decision and re-judging is the script's,
 * so a later pass that scores a muted candidate well does not un-mute it. That
 * asymmetry is the whole reason a filtered entry stays gone.
 */
export function mergeEntries(
  existing: readonly LedgerEntry[],
  incoming: readonly LedgerEntry[],
): LedgerEntry[] {
  const byId = new Map(existing.map((entry) => [entry.id, entry]));
  for (const entry of incoming) {
    const prior = byId.get(entry.id);
    if (prior?.disposition === "muted" && entry.disposition !== "muted") continue;
    byId.set(entry.id, entry);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function readLedger(root: string): Promise<Ledger> {
  try {
    const raw = await readFile(path.join(root, LEDGER_PATH), "utf8");
    return migrateLedger(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return EMPTY;
    throw error;
  }
}

export async function writeLedger(
  root: string,
  entries: readonly LedgerEntry[],
): Promise<number> {
  const ledger: Ledger = { schemaVersion: LEDGER_SCHEMA_VERSION, entries };
  const target = path.join(root, LEDGER_PATH);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  return entries.length;
}
