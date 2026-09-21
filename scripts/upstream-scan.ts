#!/usr/bin/env tsx
// Light pass over candidates worth an hour of someone's attention: the repos
// you starred, plus whatever the discovery leg found. Jev judges each one from
// its README and metadata; the gate that turns those judgments into a
// shortlist lives in ./lib/candidates.ts, so tightening a threshold never
// needs a new model call.
//
//   pnpm upstream-scan                      # judge new candidates, write nothing
//   pnpm upstream-scan --all                # re-judge everything, ignore the ledger
//   pnpm upstream-scan --repo owner/name    # judge named repos, starred or not
//   pnpm upstream-scan --discovered [path]  # also judge a /last30days sweep
//   pnpm upstream-scan --skip-discovery     # stars only, ignoring --discovered
//   pnpm upstream-scan --record             # write the ledger after the report
//   pnpm upstream-scan --mute <id>...       # never show these again
//   pnpm upstream-scan --unmute <id>...     # undo that
//
// The pass reads READMEs and trees, never clones, and never touches the web:
// `/last30days` is a skill, so the workflow runs the sweep and hands this
// script a file. A deep dive is a separate, larger decision, and the workflow
// asks a person before taking it.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  ask,
  mapLimited,
  requireApiKey,
  type ChoiceAnswer,
  type NoulAnswer,
  type Question,
  type ScoreAnswer,
} from "./lib/jev.js";
import {
  clearsGate,
  repoCandidate,
  type Candidate,
  type RepoShape,
  type Verdict,
} from "./lib/candidates.js";
import {
  mergeEntries,
  muteEntries,
  mutedIds,
  readLedger,
  seenIds,
  unmuteEntries,
  writeLedger,
  type Disposition,
  type LedgerEntry,
} from "./lib/ledger.js";
import { parseArgs } from "./lib/args.js";
import { readDiscovered } from "./lib/discovery-io.js";
import { renderHtml, renderMarkdown } from "./lib/report.js";
import {
  filedCandidates,
  readmeHead,
  repoByName,
  repoRoot,
  repoShape,
  starredRepos,
  type StarredRepo,
} from "./lib/stars-io.js";

const FIREHORSE = {
  name: "firehorse",
  what_it_is:
    "A cross-provider agentic skills framework. A pnpm TypeScript monorepo whose real product is " +
    "workflow definitions projected into provider distributions, currently a Claude Code plugin. It " +
    "tracks vendored upstream skills with a lockfile and a drift check, and reaches cross-session " +
    "memory through claude-mem.",
  existing_capabilities: [
    "definition format: schema, parser, validator, projector, manifest merge",
    "upstream lockfile and drift check against third-party skill definitions",
    "workflows already shipped: build a ticket, fix a bug, index the repo into a codebase knowledge " +
      "graph and memory, chart a wayfinder map, recall past decisions, ship a release, check upstream " +
      "drift, stand up a new project, spec and cut tickets, triage the tracker",
    "issue tracking on GitHub Issues with sub-issues, dependencies and a frontier query",
    "an evaluation framework that gates new tools on paired trials measuring lift on outcome, " +
      "process and cost",
  ],
  what_would_be_useful:
    "Something that measurably improves one of those workflows, or supplies a capability firehorse " +
    "lacks: agent context management, evaluation and benchmarking of agent changes, codebase " +
    "understanding, skill authoring quality, provider portability, agent orchestration, or " +
    "observability of agent runs.",
  what_is_not_useful:
    "General web infrastructure, serverless or cloud deployment samples, blockchain, databases, " +
    "frontend widgets, reading lists, and anything unrelated to building or running coding agents.",
};

const QUESTIONS: Record<string, Question> = {
  relevant: {
    type: "noul",
    instructions: {
      firehorse: FIREHORSE,
      question:
        "Is the repository in `state` about building, running, evaluating or tooling AI coding " +
        "agents, agent skills, agent workflows, or agent context, such that it is plausibly " +
        "relevant to `firehorse`?",
    },
    criteria: {
      true:
        "The subject matter is agentic coding: agent skills, harnesses, workflows, MCP servers, " +
        "agent memory or context, agent evaluation, or tooling built to be consumed by coding agents.",
      false:
        "The repository is about something else, such as web frameworks, cloud infrastructure, " +
        "databases, blockchain, general programming libraries, or reading lists, even if an agent " +
        "could incidentally use it.",
    },
  },
  kind: {
    type: "choice",
    instructions:
      "What kind of thing is the repository in `state`? Pick the single best description of what a " +
      "person would actually install or take from it.",
    criteria: {
      skill_collection:
        "A set of agent skills, slash commands, or plugin definitions installed into a harness.",
      agent_workflow_framework:
        "A framework or methodology that structures how an agent works through a task.",
      mcp_server: "A Model Context Protocol server exposing tools to an agent.",
      cli_or_tool: "A standalone command line tool or service an agent or developer invokes.",
      library: "A code library imported into a program.",
      model_or_research: "A model, a training or optimisation method, a paper, or a research artifact.",
      reference_material: "Documentation, awesome-lists, guides, or examples meant to be read.",
      other: "None of the above.",
    },
  },
  value_to_firehorse: {
    type: "score",
    instructions: {
      firehorse: FIREHORSE,
      question:
        "How much would adopting the repository in `state` plausibly improve one of `firehorse`'s " +
        "named workflows or supply a capability it lacks? Judge the substance of what the " +
        "repository provides, not how well its README is written.",
    },
    criteria: [
      "No connection to firehorse's work at all; adopting it would change nothing.",
      "Tangentially related to agentic coding but supplies nothing firehorse needs.",
      "Supplies ideas or conventions worth reading, but nothing directly installable or measurable.",
      "Supplies a concrete capability that maps onto a named firehorse workflow and could be trialled.",
      "Supplies a capability firehorse clearly lacks and that would plausibly change a core workflow.",
    ],
  },
  overlaps_existing: {
    type: "noul",
    instructions: {
      firehorse: FIREHORSE,
      question:
        "Does the repository in `state` substantially duplicate a capability `firehorse` already " +
        "has under `existing_capabilities`?",
    },
    criteria: {
      true:
        "It does largely the same job as something firehorse already built, so adopting it would " +
        "mostly replace working code.",
      false: "It does something firehorse has not built, or it complements rather than replaces.",
    },
  },
  workflow_touched: {
    type: "choice",
    instructions: {
      firehorse: FIREHORSE,
      question:
        "Which single firehorse workflow would the repository in `state` most affect if it were " +
        "adopted? The evaluation framework requires every candidate to name one.",
    },
    criteria: {
      build: "Building a ticket: prototyping, test-first implementation, verification evidence.",
      fix_bug: "Fixing a bug: feedback loops, tracing callers, regression evidence.",
      index: "Indexing the repo into a codebase knowledge graph and memory store.",
      recall_memory: "Recalling past decisions and persisting durable notes across sessions.",
      map_planning: "Charting and working a wayfinder map: planning, issue tracking, triage.",
      ship: "Taking verified work from branch to release.",
      upstreams_check: "Tracking drift in vendored upstream skill definitions.",
      definition_format: "The portable definition format: schema, validation, projection.",
      evaluation: "The evaluation framework: paired trials, measuring lift, benchmarking.",
      authoring_quality: "The quality of skill, prompt and document authoring itself.",
      none: "No firehorse workflow would be meaningfully affected.",
    },
  },
  // The framework's premise is that most of this field measures nothing, and
  // "Evidence so far" is an intake field. Asking here saves a deep dive from
  // being the first place anyone finds out.
  authors_measured: {
    type: "noul",
    instructions: {
      question:
        "Does the repository in `state` claim its own measured results: a benchmark it ran, an " +
        "eval harness with numbers, or a before-and-after comparison? Judge the README excerpt " +
        "and `structure.benchmark_paths` together.",
    },
    criteria: {
      true: "It reports numbers it produced itself, or ships a harness that produces them.",
      false:
        "It makes claims with no numbers behind them, cites only other people's results, or says " +
        "nothing about measurement.",
    },
  },
};

/** A candidate paired with the repo metadata behind it, when there is any. */
interface Target {
  readonly candidate: Candidate;
  readonly repo: StarredRepo | null;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();

  // Muting is a ledger edit and judges nothing, so it runs on its own and
  // returns. That is what lets you filter a report without paying to re-judge.
  if (args.mute.length > 0 || args.unmute.length > 0) {
    await applyMutes(root, args.mute, args.unmute);
    return;
  }

  const { all, record, discovered: discoveredPath } = args;
  const named = args.repos;

  const apiKey = requireApiKey();
  const [ledger, filed] = await Promise.all([readLedger(root), filedCandidates()]);
  const muted = mutedIds(ledger);
  const judgedBefore = seenIds(ledger);

  const discovered = discoveredPath ? await readDiscovered(discoveredPath) : [];
  const stars: Target[] = named.length
    ? await Promise.all(
        named.map(async (name) => {
          const repo = await repoByName(name);
          return { candidate: repoCandidate(repo), repo };
        }),
      )
    : (await starredRepos()).map((repo) => ({ candidate: repoCandidate(repo), repo }));

  // A discovered repo is enriched from GitHub so it is judged on the same
  // facts as a star. A discovered topic has no repo and is judged on the
  // sweep's own summary.
  const found: Target[] = await Promise.all(
    discovered.map(async (candidate) => {
      if (candidate.kind !== "repo") return { candidate, repo: null };
      try {
        const repo = await repoByName(candidate.name);
        return { candidate: { ...repoCandidate(repo), signal: candidate.signal }, repo };
      } catch {
        return { candidate, repo: null };
      }
    }),
  );

  // One entry per id: a repo that is both starred and discovered is one
  // candidate, and the discovery leg's signal is the more interesting half.
  const pool = [...new Map([...stars, ...found].map((t) => [t.candidate.id, t])).values()];

  // Four reasons to skip, and only the first is a judgment: muted by you,
  // judged before, already filed, or not the repo a person named.
  //
  // Naming a repo with --repo bypasses all four, mute included. Asking for a
  // specific repo now is a live instruction, and it outranks a mute recorded
  // earlier; the alternative is --repo silently returning nothing.
  const targets = named.length
    ? pool
    : pool.filter((target) => {
        const id = target.candidate.id;
        if (muted.has(id)) return false;
        if (filed.has(target.candidate.name.toLowerCase())) return false;
        return all || !judgedBefore.has(id);
      });

  if (targets.length === 0) {
    process.stdout.write(
      `Nothing new to judge. ${judgedBefore.size} judged before, ${filed.size} filed, ${muted.size} muted.\n` +
        `Re-judge everything with --all.\n`,
    );
    return;
  }

  process.stderr.write(
    `Judging ${targets.length} candidates (${pool.length} in the pool, ${discovered.length} discovered).\n`,
  );

  const verdicts = await mapLimited(targets, 4, async (target) => {
    const [readme, shape] = target.repo
      ? await Promise.all([readmeHead(target.repo.fullName), repoShape(target.repo.fullName)])
      : [null, null];
    const state = target.repo
      ? repoState(target.repo, target.candidate, readme ?? "", shape!)
      : topicState(target.candidate);
    const response = await ask(apiKey, state, QUESTIONS);
    if (process.env.UPSTREAM_SCAN_DEBUG) {
      process.stderr.write(`${target.candidate.id}: ${JSON.stringify(response).slice(0, 800)}\n`);
    }
    const answers = response.answers;
    const relevance = (answers.relevant as NoulAnswer).noul;
    const value = (answers.value_to_firehorse as ScoreAnswer).score;
    const overlap = (answers.overlaps_existing as NoulAnswer).noul;
    const workflow = answers.workflow_touched as ChoiceAnswer;
    return {
      candidate: target.candidate,
      shape,
      relevance,
      value,
      overlap,
      kind: (answers.kind as ChoiceAnswer).choice,
      workflow: workflow.choice,
      workflowConfidence: workflow.confidence,
      measured: (answers.authors_measured as NoulAnswer).noul,
      shortlisted: clearsGate(relevance, value, overlap),
      filedAs: filed.get(target.candidate.name.toLowerCase()) ?? null,
    } satisfies Verdict;
  });

  verdicts.sort((a, b) => b.value - a.value);

  const stats = {
    pool: pool.length,
    judgedBefore: judgedBefore.size,
    filed: filed.size,
    muted: muted.size,
    discovered: discovered.length,
  };
  const outDir = path.join(root, ".firehorse", "local", "upstream-scan");
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const markdown = renderMarkdown(verdicts, stats);
  const htmlPath = path.join(outDir, `${stamp}.html`);
  await Promise.all([
    writeFile(path.join(outDir, `${stamp}.md`), markdown, "utf8"),
    writeFile(htmlPath, renderHtml(verdicts, stats), "utf8"),
    writeFile(path.join(outDir, `${stamp}.json`), JSON.stringify(verdicts, null, 2), "utf8"),
  ]);
  process.stdout.write(markdown);
  process.stderr.write(`\nReport: ${htmlPath}\n`);

  if (!record) {
    process.stderr.write(`Ledger unchanged. Re-run with --record once the report has been read.\n`);
    return;
  }
  const judgedAt = new Date().toISOString().slice(0, 10);
  const entries: LedgerEntry[] = verdicts.map((verdict) => ({
    id: verdict.candidate.id,
    kind: verdict.candidate.kind,
    name: verdict.candidate.name,
    judgedAt,
    relevance: round(verdict.relevance),
    value: round(verdict.value),
    overlap: round(verdict.overlap),
    disposition: (verdict.shortlisted ? "shortlisted" : "below-gate") satisfies Disposition,
  }));
  const total = await writeLedger(root, mergeEntries(ledger.entries, entries));
  process.stderr.write(`Ledger: ${total} candidates recorded.\n`);
}

/**
 * Mute or unmute by id, without judging anything.
 *
 * Unmuting forgets the entry rather than re-labelling it, because the pool
 * filter skips every id the ledger has seen. See `unmuteEntries`.
 */
async function applyMutes(
  root: string,
  mute: readonly string[],
  unmute: readonly string[],
): Promise<void> {
  const ledger = await readLedger(root);
  const known = new Set(ledger.entries.map((entry) => entry.id));
  for (const id of unmute) {
    if (!known.has(id)) process.stderr.write(`Not in the ledger, nothing to unmute: ${id}
`);
  }

  const judgedAt = new Date().toISOString().slice(0, 10);
  const entries = unmuteEntries(muteEntries(ledger.entries, mute, judgedAt), unmute);
  await writeLedger(root, entries);

  const muted = entries.filter((entry) => entry.disposition === "muted").length;
  process.stdout.write(
    `Muted ${mute.length}, unmuted ${unmute.length}. ${muted} of ${entries.length} now hidden.
`,
  );
}

function repoState(repo: StarredRepo, candidate: Candidate, readme: string, shape: RepoShape) {
  return {
    repository: repo.fullName,
    description: repo.description,
    primary_language: repo.language,
    github_topics: repo.topics,
    stars: repo.stars,
    last_pushed: repo.pushedAt,
    archived: repo.archived,
    license: repo.license,
    structure: {
      skill_files: shape.skillCount,
      has_claude_plugin_manifest: shape.hasPluginManifest,
      largest_skill_bytes: shape.largestSkillBytes,
      benchmark_paths: shape.benchmarkPaths,
    },
    why_it_surfaced: candidate.signal,
    readme_excerpt: readme,
  };
}

/**
 * A discovered idea with no repo behind it. Jev is told plainly that this is a
 * named technique rather than a codebase, so it does not mark the absence of
 * stars and a licence against it.
 */
function topicState(candidate: Candidate) {
  return {
    subject: candidate.name,
    subject_type: "a named technique, workflow or idea, not a repository",
    summary: candidate.summary,
    why_it_surfaced: candidate.signal,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
