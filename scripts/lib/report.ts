// Both renderings of a pass. Markdown is what the model reads back; the HTML
// is what you read. Neither fetches anything, so a report opened a year from
// now still looks like it did on the day it was written.
import type { Verdict } from "./candidates.js";

export interface ReportStats {
  readonly pool: number;
  readonly judgedBefore: number;
  readonly filed: number;
  readonly muted: number;
  readonly discovered: number;
}

const GATE_LINE =
  "Gate: relevance >= 0.8, value >= 2.5, overlap < 0.5; or value >= 2.75 with relevance >= 0.55.";

export function renderMarkdown(verdicts: readonly Verdict[], stats: ReportStats): string {
  const shortlist = verdicts.filter((verdict) => verdict.shortlisted);
  const rest = verdicts.filter((verdict) => !verdict.shortlisted);
  const today = new Date().toISOString().slice(0, 10);

  const lines: string[] = [
    `# Upstream scan — ${today}`,
    "",
    `Judged ${verdicts.length} of ${stats.pool} candidates, ${stats.discovered} from the discovery leg. ` +
      `${stats.judgedBefore} judged in an earlier pass, ${stats.filed} already filed, ${stats.muted} muted.`,
    "",
    GATE_LINE,
    "",
    `## Shortlist (${shortlist.length})`,
    "",
  ];

  if (shortlist.length === 0) {
    lines.push("Nothing cleared the gate.", "");
  } else {
    lines.push(
      "| Candidate | Value | Rel | Ovlp | Workflow | Kind | Measured | Filed |",
      "|---|---|---|---|---|---|---|---|",
      ...shortlist.map((verdict) => {
        const c = verdict.candidate;
        return `| ${c.name} | ${fixed(verdict.value)} | ${fixed(verdict.relevance)} | ${fixed(verdict.overlap)} | ${verdict.workflow} | ${verdict.kind} | ${verdict.measured >= 0.5 ? "yes" : "no"} | ${verdict.filedAs ? `#${verdict.filedAs}` : "-"} |`;
      }),
      "",
      "### What each one needs a person to decide",
      "",
      ...shortlist.flatMap((verdict) => [
        `- **${verdict.candidate.name}** (\`${verdict.candidate.id}\`) — ${verdict.candidate.summary}`,
        ...openQuestions(verdict).map((question) => `  - ${question}`),
      ]),
      "",
    );
  }

  lines.push(`## Below the gate (${rest.length})`, "");
  lines.push(
    ...rest.map(
      (verdict) =>
        `- ${verdict.candidate.name} (\`${verdict.candidate.id}\`) — value ${fixed(verdict.value)}, relevance ${fixed(verdict.relevance)}, overlap ${fixed(verdict.overlap)}`,
    ),
    "",
  );
  return lines.join("\n");
}

/** What the script cannot settle, and so hands back with the entry. */
function openQuestions(verdict: Verdict): string[] {
  const questions: string[] = [];
  if (verdict.candidate.signal) questions.push(`surfaced because: ${verdict.candidate.signal}`);
  if (verdict.measured < 0.5) {
    questions.push('the authors appear to have measured nothing, so Evidence so far is "none"');
  }
  if (verdict.workflowConfidence < 0.6) {
    questions.push(
      `the workflow it touches is unclear (${verdict.workflow} at ${fixed(verdict.workflowConfidence)}), and the intake gate rejects a candidate without one`,
    );
  }
  if (verdict.shape && verdict.shape.largestSkillBytes > 40_000) {
    questions.push(
      `largest SKILL.md is ${Math.round(verdict.shape.largestSkillBytes / 1024)} KB, so the idle footprint deserves a check`,
    );
  }
  if (verdict.shape && verdict.measured < 0.5 && verdict.shape.benchmarkPaths.length > 0) {
    questions.push(
      `the README claims no measurement but the tree carries ${verdict.shape.benchmarkPaths.length} benchmark paths, so open the tree`,
    );
  }
  if (verdict.filedAs) questions.push(`already filed as #${verdict.filedAs}`);
  return questions;
}

export function renderHtml(verdicts: readonly Verdict[], stats: ReportStats): string {
  const shortlist = verdicts.filter((verdict) => verdict.shortlisted);
  const rest = verdicts.filter((verdict) => !verdict.shortlisted);
  const today = new Date().toISOString().slice(0, 10);

  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Upstream scan — ${today}</title>
    <style>
      :root {
        --bg: #0e1014;
        --panel: #161a21;
        --panel-2: #1c212a;
        --line: #2a313d;
        --ink: #e6e9ef;
        --ink-2: #9aa4b5;
        --ink-3: #6b7484;
        --ok: #4ade80;
        --warn: #fbbf24;
        --info: #60a5fa;
        --gap: #f87171;
        --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
        --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif;
      }
      :root[data-theme="light"] {
        --bg: #f7f8fa;
        --panel: #ffffff;
        --panel-2: #f0f2f6;
        --line: #dde1e8;
        --ink: #14181f;
        --ink-2: #5a6474;
        --ink-3: #8a93a3;
      }
      @media (prefers-color-scheme: light) {
        :root:not([data-theme="dark"]) {
          --bg: #f7f8fa;
          --panel: #ffffff;
          --panel-2: #f0f2f6;
          --line: #dde1e8;
          --ink: #14181f;
          --ink-2: #5a6474;
          --ink-3: #8a93a3;
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px 16px 64px;
        background: var(--bg);
        color: var(--ink);
        font-family: var(--sans);
        line-height: 1.5;
      }
      main { max-width: 900px; margin: 0 auto; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-2); margin: 32px 0 12px; font-weight: 600; }
      .sub { color: var(--ink-2); font-size: 13px; margin: 0 0 8px; }
      .gate { color: var(--ink-3); font-size: 12px; font-family: var(--mono); margin: 0 0 24px; }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 10px;
      }
      .card.dim { background: var(--panel-2); opacity: 0.72; padding: 10px 16px; }
      .head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
      .name { font-weight: 600; font-size: 15px; }
      .name a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line); }
      .name a:hover { border-color: var(--info); }
      .tag {
        font-family: var(--mono); font-size: 11px; padding: 1px 6px;
        border-radius: 4px; border: 1px solid var(--line); color: var(--ink-2);
      }
      .tag.topic { color: var(--warn); border-color: var(--warn); }
      .summary { color: var(--ink-2); font-size: 13px; margin: 8px 0 0; }
      .meters { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; }
      .meter { min-width: 104px; }
      .meter .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); }
      .meter .value { font-family: var(--mono); font-size: 13px; }
      .bar { height: 3px; background: var(--line); border-radius: 2px; margin-top: 3px; overflow: hidden; }
      .bar i { display: block; height: 100%; background: var(--info); }
      .bar i.ok { background: var(--ok); }
      .bar i.gap { background: var(--gap); }
      ul.q { margin: 10px 0 0; padding-left: 18px; color: var(--ink-2); font-size: 13px; }
      ul.q li { margin-bottom: 3px; }
      .id { font-family: var(--mono); font-size: 11px; color: var(--ink-3); user-select: all; }
      .empty { color: var(--ink-3); font-style: italic; font-size: 13px; }
      .row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
      .nums { font-family: var(--mono); font-size: 12px; color: var(--ink-3); white-space: nowrap; }
    </style>
  </head>
  <body>
    <main>
      <h1>Upstream scan</h1>
      <p class="sub">
        ${today} · judged ${verdicts.length} of ${stats.pool} candidates, ${stats.discovered} from discovery ·
        ${stats.judgedBefore} judged before · ${stats.filed} filed · ${stats.muted} muted
      </p>
      <p class="gate">${escapeHtml(GATE_LINE)}</p>

      <h2>Shortlist (${shortlist.length})</h2>
      ${shortlist.length === 0 ? `<p class="empty">Nothing cleared the gate.</p>` : shortlist.map(card).join("\n      ")}

      <h2>Below the gate (${rest.length})</h2>
      ${rest.length === 0 ? `<p class="empty">Nothing fell below it.</p>` : rest.map(dimCard).join("\n      ")}
    </main>
  </body>
</html>
`;
}

function card(verdict: Verdict): string {
  const c = verdict.candidate;
  const questions = openQuestions(verdict);
  return `<section class="card">
        <div class="head">
          <span class="name">${linkName(c.name, c.url)}</span>
          <span class="tag ${c.kind}">${c.kind}</span>
          <span class="tag">${escapeHtml(verdict.workflow)}</span>
          ${verdict.filedAs ? `<span class="tag">filed #${verdict.filedAs}</span>` : ""}
        </div>
        ${c.summary ? `<p class="summary">${escapeHtml(c.summary)}</p>` : ""}
        <div class="meters">
          ${meter("value", verdict.value / 4, fixed(verdict.value), "ok")}
          ${meter("relevance", verdict.relevance, fixed(verdict.relevance), "")}
          ${meter("overlap", verdict.overlap, fixed(verdict.overlap), "gap")}
        </div>
        ${questions.length ? `<ul class="q">${questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ul>` : ""}
        <p class="id">${escapeHtml(c.id)}</p>
      </section>`;
}

function dimCard(verdict: Verdict): string {
  const c = verdict.candidate;
  return `<section class="card dim">
        <div class="row">
          <span>${linkName(c.name, c.url)} <span class="id">${escapeHtml(c.id)}</span></span>
          <span class="nums">v ${fixed(verdict.value)} · r ${fixed(verdict.relevance)} · o ${fixed(verdict.overlap)}</span>
        </div>
      </section>`;
}

function meter(label: string, fraction: number, value: string, tone: string): string {
  const width = Math.max(0, Math.min(1, fraction)) * 100;
  return `<div class="meter">
            <div class="label">${label}</div>
            <div class="value">${value}</div>
            <div class="bar"><i class="${tone}" style="width:${width.toFixed(0)}%"></i></div>
          </div>`;
}

/** A topic has no url, so it renders as text rather than an empty anchor. */
function linkName(name: string, url: string | null): string {
  const safe = escapeHtml(name);
  return url ? `<a href="${escapeHtml(url)}">${safe}</a>` : safe;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fixed(value: number): string {
  return value.toFixed(2);
}
