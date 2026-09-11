import { describe, expect, it } from "vitest";

import { ALL_PROJECTS, scopeToContainerTags } from "./scope.ts";

const PROJECTS = [
  { tag: "repo_a__0123456789abcdef", name: "a", documentCount: 1, memoryCount: 1 },
  { tag: "repo_b__fedcba9876543210", name: "b", documentCount: 2, memoryCount: 2 },
];

describe("scopeToContainerTags", () => {
  it("scopes to the one selected project", () => {
    expect(scopeToContainerTags("repo_a__0123456789abcdef")).toEqual(["repo_a__0123456789abcdef"]);
  });

  it("asks for nothing when listing every project, which the API reads as no filter", () => {
    expect(scopeToContainerTags(ALL_PROJECTS)).toEqual([]);
  });

  it("names every project when one is supplied, because search cannot go unscoped", () => {
    expect(scopeToContainerTags(ALL_PROJECTS, PROJECTS)).toEqual([
      "repo_a__0123456789abcdef",
      "repo_b__fedcba9876543210",
    ]);
  });

  it("ignores the project list once a single project is selected", () => {
    expect(scopeToContainerTags("repo_b__fedcba9876543210", PROJECTS)).toEqual([
      "repo_b__fedcba9876543210",
    ]);
  });
});
