import { describe, expect, it } from "vitest";

import {
  appendToSection,
  renderUpstreamSkillTable,
  resolveUpstreamSkills,
  type UpstreamLockSlice,
} from "./index.js";

const lock: UpstreamLockSlice = {
  plugins: {
    "mattpocock-skills": {
      marketplace: "claude-plugins-official",
      version: "1.2.3",
      skills: {
        tdd: { path: "skills/engineering/tdd/SKILL.md", modelInvocable: true },
        wayfinder: { path: "skills/engineering/wayfinder/SKILL.md", modelInvocable: false },
      },
    },
    impeccable: {
      marketplace: "impeccable",
      version: "4.3.1",
      skills: { impeccable: { path: "skills/impeccable/SKILL.md", modelInvocable: true } },
    },
  },
};

describe("resolveUpstreamSkills", () => {
  it("keys every installed skill by its plugin:skill invocation", () => {
    const resolutions = resolveUpstreamSkills(lock);

    expect(Object.keys(resolutions).sort()).toEqual([
      "impeccable:impeccable",
      "mattpocock-skills:tdd",
      "mattpocock-skills:wayfinder",
    ]);
    expect(resolutions["mattpocock-skills:tdd"]).toEqual({
      invocation: "mattpocock-skills:tdd",
      plugin: "mattpocock-skills",
      id: "tdd",
      marketplace: "claude-plugins-official",
      version: "1.2.3",
      skillPath: "skills/engineering/tdd/SKILL.md",
      modelInvocable: true,
    });
  });
});

describe("renderUpstreamSkillTable", () => {
  const resolutions = resolveUpstreamSkills(lock);

  it("renders one row per reference, in declaration order", () => {
    const table = renderUpstreamSkillTable({
      references: [
        { upstream: "impeccable", id: "impeccable" },
        { upstream: "mattpocock-skills", id: "tdd" },
      ],
      resolutions,
    });

    const rows = table!.split("\n").filter((line) => line.startsWith("| `"));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("`impeccable:impeccable`");
    expect(rows[0]).toContain("impeccable/impeccable/4.3.1/skills/impeccable/SKILL.md");
    expect(rows[1]).toContain("`mattpocock-skills:tdd`");
  });

  it("tells the agent to read a user-invoked skill instead of invoking it", () => {
    const table = renderUpstreamSkillTable({
      references: [
        { upstream: "mattpocock-skills", id: "wayfinder" },
        { upstream: "mattpocock-skills", id: "tdd" },
      ],
      resolutions,
    });
    const rows = table!.split("\n").filter((line) => line.startsWith("| `"));

    expect(rows[0]).toContain("read the file and follow it inline");
    expect(rows[0]).not.toContain("invoke `mattpocock-skills:wayfinder`");
    expect(rows[1]).toContain("invoke `mattpocock-skills:tdd`");
  });

  it("marks an unresolved reference rather than dropping its row", () => {
    const table = renderUpstreamSkillTable({
      references: [{ upstream: "mattpocock-skills", id: "moved-away" }],
      resolutions,
    });

    expect(table).toContain("`mattpocock-skills:moved-away`");
    expect(table).toContain("unresolved");
  });

  it("renders nothing when a workflow orchestrates no upstream skill", () => {
    expect(renderUpstreamSkillTable({ references: [], resolutions })).toBeNull();
  });
});

describe("appendToSection", () => {
  const body = [
    "## Supporting Capabilities",
    "",
    "- One upstream.",
    "",
    "## Orchestration Intent",
    "",
    "Prose.",
  ].join("\n");

  it("appends inside the named section, not at the end of the body", () => {
    const result = appendToSection(body, "Supporting Capabilities", "BLOCK");
    const lines = result.split("\n");

    expect(lines.indexOf("BLOCK")).toBeGreaterThan(lines.indexOf("- One upstream."));
    expect(lines.indexOf("BLOCK")).toBeLessThan(lines.indexOf("## Orchestration Intent"));
  });

  it("leaves a body without that heading unchanged", () => {
    expect(appendToSection(body, "Gotchas", "BLOCK")).toBe(body);
  });

  it("ignores headings inside fenced blocks", () => {
    const fenced = [
      "## Supporting Capabilities",
      "",
      "```markdown",
      "## Orchestration Intent",
      "```",
      "",
      "## Orchestration Intent",
      "",
      "Prose.",
    ].join("\n");

    const lines = appendToSection(fenced, "Supporting Capabilities", "BLOCK").split("\n");
    expect(lines.indexOf("BLOCK")).toBeGreaterThan(lines.indexOf("```markdown"));
    expect(lines.indexOf("BLOCK")).toBeLessThan(lines.lastIndexOf("## Orchestration Intent"));
  });
});
