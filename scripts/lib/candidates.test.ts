import { describe, expect, it } from "vitest";

import { clearsGate, repoCandidate, topicCandidate } from "./candidates.js";

describe("candidate identity", () => {
  it("keys a repo case-insensitively, so a restar under different casing is the same entry", () => {
    const a = repoCandidate({ fullName: "NeoLabHQ/context-engineering-kit", description: "x" });
    const b = repoCandidate({ fullName: "neolabhq/CONTEXT-ENGINEERING-KIT", description: "x" });
    expect(a.id).toBe(b.id);
    expect(a.id).toBe("repo:neolabhq/context-engineering-kit");
  });

  it("keeps the repo's own casing for display while keying on the lowered form", () => {
    const candidate = repoCandidate({ fullName: "NeoLabHQ/context-engineering-kit", description: "x" });
    expect(candidate.name).toBe("NeoLabHQ/context-engineering-kit");
  });

  it("slugs a topic so the same idea phrased twice mutes once", () => {
    expect(topicCandidate({ name: "Loop Engineering", summary: "s" }).id).toBe("topic:loop-engineering");
    expect(topicCandidate({ name: "loop  engineering!", summary: "s" }).id).toBe("topic:loop-engineering");
  });

  it("gives a repo candidate its GitHub URL and a topic none", () => {
    expect(repoCandidate({ fullName: "a/b", description: "x" }).url).toBe("https://github.com/a/b");
    expect(topicCandidate({ name: "t", summary: "s" }).url).toBeNull();
  });
});

describe("the gate", () => {
  it("admits a repo that clears relevance and value with low overlap", () => {
    expect(clearsGate(0.96, 2.67, 0.34)).toBe(true);
  });

  it("rejects anything at or above the overlap ceiling, however valuable", () => {
    expect(clearsGate(0.99, 4, 0.5)).toBe(false);
  });

  it("admits a general-purpose tool on the value override when relevance reads low", () => {
    // GEPA on the first pass: high value, low relevance because it is not
    // agent-specific. The override is the only reason it survives.
    expect(clearsGate(0.63, 2.91, 0.17)).toBe(true);
  });

  it("rejects a low-relevance repo whose value sits under the override", () => {
    expect(clearsGate(0.63, 2.62, 0.17)).toBe(false);
  });
});
