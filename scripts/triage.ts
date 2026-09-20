#!/usr/bin/env tsx
// Recurring tracker triage. Jev judges each open issue along four dimensions;
// this file owns the policy that turns those judgments into label and
// sub-issue actions, so a threshold change never needs a new model call.
//
//   pnpm triage            # judge and report, change nothing
//   pnpm triage --apply    # also run the actions that cleared their threshold
//   pnpm triage --only 245,246
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
  addLabel,
  attachSubIssue,
  openIssues,
  repoSlug,
  subIssueNumbers,
  type Issue,
} from "./lib/tracker-io.js";

const MAP_LABEL = "wayfinder:map";
const TRIAGE_LABELS = ["ready-for-agent", "ready-for-human", "needs-info", "needs-triage"] as const;
const KIND_LABELS: Record<string, string | null> = {
  defect: "bug",
  capability: "enhancement",
  docs: "documentation",
  decision: null,
  research: null,
  candidate: null,
  concept: null,
};

// Thresholds are the policy. They were set by reading the first dry run, not
// derived from anything the model reports about itself.
const GROUP_THRESHOLD = 0.55;
const KIND_THRESHOLD = 0.65;
const READINESS_THRESHOLD = 0.65;
const NOUL_THRESHOLD = 0.8;

// The vocabulary docs/agents/issue-tracker.md defines, and the rules it states
// about how those labels combine. Violations are reported, never auto-fixed:
// an eval lifecycle move is a maintainer's call, not a judgment call.
const EVAL_LABELS = [
  "eval:proposed",
  "eval:shortlisted",
  "eval:trialling",
  "eval:adopted",
  "eval:rejected",
] as const;

const REPO_CONTEXT =
  "Firehorse is a cross-provider agentic skills framework: a pnpm TypeScript monorepo whose real " +
  "product is workflow definitions projected into a Claude Code plugin. Work is tracked as wayfinder " +
  "maps (a goal) with sub-issues under them (decisions, research, prototypes, manual tasks).";

interface Judgment {
  readonly issue: Issue;
  readonly group: ChoiceAnswer;
  readonly kind: ChoiceAnswer;
  readonly readiness: ChoiceAnswer;
  readonly urgency: ScoreAnswer;
  readonly shippedHarm: NoulAnswer;
  readonly externalTool: NoulAnswer;
  readonly optionalDependency: NoulAnswer;
  readonly fromSessionHistory: NoulAnswer;
  readonly priority: number;
}

interface Action {
  readonly issue: number;
  readonly kind: "label" | "attach";
  readonly detail: string;
  readonly confidence: number;
  readonly run: () => Promise<void>;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const only = parseOnly(argv);

  const apiKey = requireApiKey();
  const slug = await repoSlug();
  const issues = await openIssues();

  const maps = issues.filter((issue) => hasLabel(issue, MAP_LABEL));
  const parentOf = new Map<number, number>();
  for (const map of maps) {
    for (const child of await subIssueNumbers(slug, map.number)) {
      parentOf.set(child, map.number);
    }
  }

  const candidates = issues
    .filter((issue) => !hasLabel(issue, MAP_LABEL) && !hasLabel(issue, "parked"))
    .filter((issue) => (only ? only.has(issue.number) : true));

  const groupCriteria = buildGroupCriteria(maps);
  process.stderr.write(`Judging ${candidates.length} open issues against ${maps.length} maps.\n`);

  const judgments = await mapLimited(candidates, 4, async (issue) => {
    const response = await ask(
      apiKey,
      issueState(issue, parentOf.get(issue.number)),
      questions(groupCriteria),
    );
    if (process.env.TRIAGE_DEBUG)
      process.stderr.write(JSON.stringify(response).slice(0, 1500) + "\n");
    const answers = response.answers;
    const urgency = answers.urgency as ScoreAnswer;
    const shippedHarm = answers.shipped_harm as NoulAnswer;
    const levels = Object.keys(urgency.legend).length - 1;
    return {
      issue,
      group: answers.group as ChoiceAnswer,
      kind: answers.kind as ChoiceAnswer,
      readiness: answers.readiness as ChoiceAnswer,
      urgency,
      shippedHarm,
      externalTool: answers.external_tool as NoulAnswer,
      optionalDependency: answers.optional_dependency as NoulAnswer,
      fromSessionHistory: answers.from_session_history as NoulAnswer,
      priority: 0.7 * (urgency.score / levels) + 0.3 * shippedHarm.noul,
    } satisfies Judgment;
  });

  const actions = plan(judgments, parentOf, slug);
  const report = renderReport(judgments, actions, maps, parentOf, vocabularyViolations(issues));
  const outDir = path.join(process.cwd(), ".firehorse", "local", "triage");
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const reportPath = path.join(outDir, `${stamp}.md`);
  await writeFile(reportPath, report, "utf8");
  await writeFile(path.join(outDir, `${stamp}.json`), JSON.stringify(judgments, null, 2), "utf8");
  process.stdout.write(report);
  process.stderr.write(`\nReport: ${reportPath}\n`);

  if (!apply) {
    process.stderr.write(`${actions.length} actions proposed. Re-run with --apply to run them.\n`);
    return;
  }
  for (const action of actions) {
    await action.run();
    process.stderr.write(`applied: #${action.issue} ${action.detail}\n`);
  }
}

function parseOnly(argv: readonly string[]): Set<number> | null {
  const index = argv.indexOf("--only");
  if (index === -1) return null;
  const raw = argv[index + 1] ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter(Number.isFinite),
  );
}

function hasLabel(issue: Issue, name: string): boolean {
  return issue.labels.some((label) => label.name === name);
}

function buildGroupCriteria(maps: readonly Issue[]): Record<string, string> {
  const criteria: Record<string, string> = {};
  for (const map of maps) {
    criteria[`map-${map.number}`] = `${map.title}. ${firstParagraph(map.body)}`.slice(0, 600);
  }
  criteria.none =
    "The issue does not belong under any of these goals. Pick this when it would only fit by being vague.";
  return criteria;
}

function firstParagraph(body: string): string {
  return (
    (body ?? "")
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find((block) => block.length > 0 && !block.startsWith("#")) ?? ""
  );
}

function issueState(issue: Issue, parent: number | undefined): unknown {
  return {
    repository: REPO_CONTEXT,
    issue: {
      number: issue.number,
      title: issue.title,
      body: (issue.body ?? "").slice(0, 6000),
      current_labels: issue.labels.map((label) => label.name),
      already_grouped_under: parent ? `map-${parent}` : null,
      opened: issue.createdAt,
    },
  };
}

function questions(groupCriteria: Record<string, string>): Record<string, Question> {
  return {
    group: {
      type: "choice",
      instructions: {
        question:
          "Which goal does `issue` do work toward? Judge by the outcome the issue moves, not by shared " +
          "vocabulary. If `issue.already_grouped_under` is set, that grouping is evidence but not binding.",
        goals: "Each option below is an open goal in this tracker.",
      },
      criteria: groupCriteria,
    },
    kind: {
      type: "choice",
      instructions: "What kind of work item is `issue`?",
      criteria: {
        defect:
          "Something already written or shipped in this repo is wrong, contradictory, or broken.",
        capability: "New behavior, a new workflow, or an extension of an existing one.",
        docs: "The change is to prose that documents the project, with no behavior change.",
        decision: "A judgment call a person has to make before the work can be specified.",
        research: "An open factual question to be answered by investigation or measurement.",
        candidate: "An outside tool, repo, or skill proposed for evaluation and possible adoption.",
        concept: "A parked idea kept for later, not a work item anyone intends to act on now.",
      },
    },
    readiness: {
      type: "choice",
      instructions:
        "Could an autonomous coding agent do the whole of `issue` right now from its body alone, " +
        "with no further input?",
      criteria: {
        "ready-for-agent":
          "The body names the files or surfaces to change and what correct looks like. An agent can finish it and verify it.",
        "ready-for-human":
          "It needs a person: a taste call, a decision between options, an outside account, or a conversation.",
        "needs-info":
          "The intent is not recoverable from the body. Someone must say what is actually wanted before anyone starts.",
      },
    },
    urgency: {
      type: "score",
      instructions:
        "How soon does `issue` need doing, judged by what it costs to leave undone for another month?",
      criteria: [
        "Nothing degrades. It is an idea worth keeping, not work worth scheduling.",
        "Mild ongoing friction the maintainer works around without noticing.",
        "It blocks or misdirects other open work in this tracker.",
        "A shipped surface is actively wrong or broken for users right now.",
      ],
    },
    external_tool: {
      type: "noul",
      instructions:
        "Does `issue` propose that Firehorse take in a tool, repo, skill, or workflow built outside this project?",
      criteria: {
        true: "It names an outside artifact and asks whether Firehorse should adopt, trial, or port it.",
        false: "The work is Firehorse's own, even where it uses an outside library.",
      },
    },
    optional_dependency: {
      type: "noul",
      instructions:
        "Does the work in `issue` only function when a third-party dependency outside this repo is installed and configured?",
      criteria: {
        true: "Without that outside dependency present, the behavior cannot work at all.",
        false: "It works from what this repo and the Claude Code harness already provide.",
      },
    },
    from_session_history: {
      type: "noul",
      instructions:
        "Was `issue` found by reading this project's own session history or a session retro, rather than reported from outside?",
      criteria: {
        true: "The body cites a retro file, a dated session, or behavior observed in a past run of these workflows.",
        false: "It comes from reading the code, the docs, or an outside source.",
      },
    },
    shipped_harm: {
      type: "noul",
      instructions:
        "Does `issue` describe something that misleads or breaks someone using the released Firehorse plugin today?",
      criteria: {
        true: "A released command, skill, or document behaves or reads wrongly for an outside user.",
        false: "It concerns the maintainer's own process, internal docs, or work not yet released.",
      },
    },
  };
}

function plan(
  judgments: readonly Judgment[],
  parentOf: ReadonlyMap<number, number>,
  slug: string,
): Action[] {
  const actions: Action[] = [];
  for (const judgment of judgments) {
    const { issue } = judgment;

    const kindLabel = KIND_LABELS[judgment.kind.choice] ?? null;
    const hasKindLabel = ["bug", "enhancement", "documentation"].some((name) =>
      hasLabel(issue, name),
    );
    if (kindLabel && !hasKindLabel && judgment.kind.confidence >= KIND_THRESHOLD) {
      actions.push({
        issue: issue.number,
        kind: "label",
        detail: `+${kindLabel}`,
        confidence: judgment.kind.confidence,
        run: () => addLabel(issue.number, kindLabel),
      });
    }

    const hasTriageLabel = TRIAGE_LABELS.some((name) => hasLabel(issue, name));
    const wayfinderTicket = issue.labels.some((label) => label.name.startsWith("wayfinder:"));
    if (
      !hasTriageLabel &&
      !wayfinderTicket &&
      judgment.readiness.confidence >= READINESS_THRESHOLD
    ) {
      const label = judgment.readiness.choice;
      actions.push({
        issue: issue.number,
        kind: "label",
        detail: `+${label}`,
        confidence: judgment.readiness.confidence,
        run: () => addLabel(issue.number, label),
      });
    }

    const integrationWork =
      judgment.kind.choice === "capability" || judgment.kind.choice === "defect";
    if (
      judgment.optionalDependency.noul >= NOUL_THRESHOLD &&
      integrationWork &&
      !hasLabel(issue, "optional-dep")
    ) {
      actions.push({
        issue: issue.number,
        kind: "label",
        detail: "+optional-dep",
        confidence: judgment.optionalDependency.noul,
        run: () => addLabel(issue.number, "optional-dep"),
      });
    }
    const citesSession = /retro|session history|\.planning|transcript|session on 20\d\d-/i.test(
      issue.body ?? "",
    );
    if (
      judgment.fromSessionHistory.noul >= NOUL_THRESHOLD &&
      citesSession &&
      !hasLabel(issue, "retro")
    ) {
      actions.push({
        issue: issue.number,
        kind: "label",
        detail: "+retro",
        confidence: judgment.fromSessionHistory.noul,
        run: () => addLabel(issue.number, "retro"),
      });
    }

    const grouped = parentOf.has(issue.number);
    const target = judgment.group.choice;
    if (!grouped && target !== "none" && judgment.group.confidence >= GROUP_THRESHOLD) {
      const parent = Number.parseInt(target.slice("map-".length), 10);
      actions.push({
        issue: issue.number,
        kind: "attach",
        detail: `sub-issue of #${parent}`,
        confidence: judgment.group.confidence,
        run: () => attachSubIssue(slug, parent, issue.number),
      });
    }
  }
  return actions;
}

// Straight from docs/agents/issue-tracker.md. No model call: these are rules the
// document states, so a violation is a fact, not a judgment.
function vocabularyViolations(issues: readonly Issue[]): string[] {
  const violations: string[] = [];
  for (const issue of issues) {
    const names = issue.labels.map((label) => label.name);
    const evals = names.filter((name) => (EVAL_LABELS as readonly string[]).includes(name));
    const wayfinder = names.filter((name) => name.startsWith("wayfinder:"));
    const triage = names.filter((name) => (TRIAGE_LABELS as readonly string[]).includes(name));

    if (names.includes("candidate") && evals.length !== 1) {
      violations.push(
        `#${issue.number} carries \`candidate\` with ${evals.length} \`eval:\` labels; a candidate carries exactly one.`,
      );
    }
    if (evals.length > 0 && !names.includes("candidate")) {
      violations.push(`#${issue.number} carries \`${evals[0]}\` without \`candidate\`.`);
    }
    if (names.includes("concept") && !names.includes("parked")) {
      violations.push(`#${issue.number} is a \`concept\` that is not \`parked\`.`);
    }
    if (names.includes("concept") && wayfinder.length > 0) {
      violations.push(
        `#${issue.number} is a \`concept\` carrying ${wayfinder[0]}; a parked concept is not a work item.`,
      );
    }
    if (names.includes("parked") && triage.length > 0) {
      violations.push(`#${issue.number} is \`parked\` and still carries ${triage[0]}.`);
    }
    if (wayfinder.length > 1) {
      violations.push(
        `#${issue.number} carries ${wayfinder.length} wayfinder labels: ${wayfinder.join(", ")}.`,
      );
    }
    if (triage.length > 1) {
      violations.push(
        `#${issue.number} carries ${triage.length} triage labels: ${triage.join(", ")}.`,
      );
    }
  }
  return violations;
}

function renderReport(
  judgments: readonly Judgment[],
  actions: readonly Action[],
  maps: readonly Issue[],
  parentOf: ReadonlyMap<number, number>,
  violations: readonly string[],
): string {
  const lines: string[] = [];
  const titleOf = new Map<string, string>(maps.map((map) => [`map-${map.number}`, map.title]));
  lines.push(`# Tracker triage — ${new Date().toISOString().slice(0, 10)}`, "");
  lines.push(`${judgments.length} open issues judged by Jev against ${maps.length} maps.`, "");

  lines.push("## Ranked by urgency", "");
  const ranked = [...judgments].sort((a, b) => b.priority - a.priority).slice(0, 20);
  lines.push(
    "| # | Issue | Priority | Urgency | Readiness | Group |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const judgment of ranked) {
    lines.push(
      `| ${judgment.issue.number} | ${escape(judgment.issue.title)} | ${judgment.priority.toFixed(2)} | ` +
        `${judgment.urgency.score.toFixed(2)} | ${judgment.readiness.choice} | ${groupName(judgment, titleOf)} |`,
    );
  }
  lines.push("");

  lines.push("## Grouping", "");
  const byGroup = new Map<string, Judgment[]>();
  for (const judgment of judgments) {
    const key = judgment.group.confidence >= GROUP_THRESHOLD ? judgment.group.choice : "unsure";
    byGroup.set(key, [...(byGroup.get(key) ?? []), judgment]);
  }
  for (const [key, members] of [...byGroup.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const heading =
      key === "none"
        ? "Belongs to no open map"
        : key === "unsure"
          ? "Model was unsure"
          : `${key} — ${titleOf.get(key) ?? ""}`;
    lines.push(`### ${heading}`, "");
    for (const member of members.sort((a, b) => b.priority - a.priority)) {
      const already = parentOf.get(member.issue.number);
      const state = already ? `already under #${already}` : "unattached";
      lines.push(
        `- #${member.issue.number} ${escape(member.issue.title)} — ${state}, ` +
          `confidence ${member.group.confidence.toFixed(2)}`,
      );
    }
    lines.push("");
  }

  lines.push("## Proposed actions", "");
  if (actions.length === 0) {
    lines.push("None cleared their threshold.", "");
  } else {
    for (const action of actions) {
      lines.push(`- #${action.issue} ${action.detail} (${action.confidence.toFixed(2)})`);
    }
    lines.push("");
  }

  lines.push("## Possible evaluation candidates", "");
  const suggested = judgments.filter(
    (judgment) =>
      judgment.externalTool.noul >= NOUL_THRESHOLD &&
      !judgment.issue.labels.some((label) => label.name === "candidate"),
  );
  if (suggested.length === 0) {
    lines.push("None. Every issue proposing an outside artifact already carries `candidate`.", "");
  } else {
    lines.push(
      "These read as proposing an outside tool, repo, or skill. `docs/agents/issue-tracker.md` files a candidate " +
        "through `gh issue create --template candidate.yml`, so none of this is applied: decide whether each one " +
        "is really an intake, and file it through the form if it is.",
      "",
    );
    for (const judgment of suggested) {
      lines.push(
        `- #${judgment.issue.number} ${escape(judgment.issue.title)} (${judgment.externalTool.noul.toFixed(2)})`,
      );
    }
    lines.push("");
  }

  lines.push("## Label vocabulary", "");
  if (violations.length === 0) {
    lines.push("Every open issue obeys the combining rules in `docs/agents/issue-tracker.md`.", "");
  } else {
    lines.push(
      "Rules from `docs/agents/issue-tracker.md` that open issues break. Fix these by hand:",
      "",
    );
    for (const violation of violations) lines.push(`- ${violation}`);
    lines.push("");
  }

  lines.push("## Left to a person", "");
  for (const judgment of judgments) {
    const reasons: string[] = [];
    if (judgment.group.confidence < GROUP_THRESHOLD) reasons.push("no clear group");
    if (judgment.readiness.choice === "needs-info")
      reasons.push("body does not say what is wanted");
    if (judgment.readiness.confidence < READINESS_THRESHOLD) reasons.push("readiness unclear");
    if (reasons.length > 0) {
      lines.push(
        `- #${judgment.issue.number} ${escape(judgment.issue.title)} — ${reasons.join("; ")}`,
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

function groupName(judgment: Judgment, titleOf: ReadonlyMap<string, string>): string {
  if (judgment.group.confidence < GROUP_THRESHOLD) return "unsure";
  if (judgment.group.choice === "none") return "none";
  return `#${judgment.group.choice.slice("map-".length)}`;
}

function escape(text: string): string {
  return text.replace(/\|/g, "\\|");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
