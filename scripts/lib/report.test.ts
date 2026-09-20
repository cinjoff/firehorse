import { describe, expect, it } from "vitest";

import { renderHtml, renderMarkdown } from "./report.js";
import type { Verdict } from "./candidates.js";

const shortlisted: Verdict = {
  candidate: {
    id: "repo:neolabhq/context-engineering-kit",
    kind: "repo",
    name: "NeoLabHQ/context-engineering-kit",
    url: "https://github.com/NeoLabHQ/context-engineering-kit",
    summary: "Hand-crafted Claude Code Skills.",
    signal: null,
  },
  shape: { skillCount: 204, largestSkillBytes: 118233, benchmarkPaths: [], hasPluginManifest: true },
  relevance: 0.96,
  value: 2.67,
  overlap: 0.34,
  kind: "skill_collection",
  workflow: "authoring_quality",
  workflowConfidence: 0.8,
  measured: 0.1,
  shortlisted: true,
  filedAs: 266,
};

const belowGate: Verdict = {
  ...shortlisted,
  candidate: { id: "topic:loop-engineering", kind: "topic", name: "Loop engineering", url: null, summary: "Agent loop as the unit of design.", signal: "trending on HN" },
  relevance: 0.4,
  value: 1.2,
  shortlisted: false,
  filedAs: null,
  shape: null,
};

const stats = { pool: 2, judgedBefore: 0, filed: 6, muted: 3, discovered: 1 };

describe("markdown report", () => {
  it("separates the shortlist from what fell below the gate", () => {
    const md = renderMarkdown([shortlisted, belowGate], stats);
    expect(md).toMatch(/## Shortlist \(1\)/);
    expect(md).toMatch(/## Below the gate \(1\)/);
  });

  it("says how many entries are muted, so a hidden pool is never silent", () => {
    expect(renderMarkdown([shortlisted], stats)).toMatch(/3 muted/);
  });

  it("marks an entry already filed with its issue number", () => {
    expect(renderMarkdown([shortlisted], stats)).toMatch(/#266/);
  });
});

describe("html report", () => {
  it("renders a self-contained document with no external fetches", () => {
    const html = renderHtml([shortlisted, belowGate], stats);
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).not.toMatch(/<script\s+src=|<link[^>]+href="https?:/i);
  });

  it("links a repo candidate to its url and leaves a topic unlinked", () => {
    const html = renderHtml([shortlisted, belowGate], stats);
    expect(html).toContain('href="https://github.com/NeoLabHQ/context-engineering-kit"');
    expect(html).not.toContain('href="null"');
  });

  it("shows each candidate's relevance and summary", () => {
    const html = renderHtml([shortlisted], stats);
    expect(html).toContain("0.96");
    expect(html).toContain("Hand-crafted Claude Code Skills.");
  });

  it("carries the mute id on each row so the filter step can name it back", () => {
    expect(renderHtml([shortlisted], stats)).toContain("repo:neolabhq/context-engineering-kit");
  });

  it("escapes markup in a summary rather than injecting it", () => {
    const nasty: Verdict = {
      ...shortlisted,
      candidate: { ...shortlisted.candidate, summary: '<img src=x onerror="alert(1)">' },
    };
    const html = renderHtml([nasty], stats);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("renders with no verdicts at all", () => {
    expect(() => renderHtml([], { ...stats, pool: 0 })).not.toThrow();
  });
});

describe("the hidden pool is never silent", () => {
  it("shows the muted count in the html as well as the markdown", () => {
    // The spec asks for this in the page specifically: "The HTML shows how
    // many are hidden."
    expect(renderHtml([shortlisted], stats)).toMatch(/3 muted/);
  });
});
