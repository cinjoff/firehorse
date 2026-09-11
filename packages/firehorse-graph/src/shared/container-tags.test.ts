import { describe, expect, it } from "vitest";

import { parseContainerTag } from "./container-tags.ts";

describe("parseContainerTag", () => {
  it("recovers the project name from a generated tag", () => {
    expect(parseContainerTag("repo_firehorse__cb4653b1d26a8449")).toEqual({
      tag: "repo_firehorse__cb4653b1d26a8449",
      name: "firehorse",
      hash: "cb4653b1d26a8449",
      generated: true,
    });
  });

  it("keeps the underscores a sanitized name legitimately contains", () => {
    const parsed = parseContainerTag("repo_my_app_v2__0123456789abcdef");

    expect(parsed.name).toBe("my_app_v2");
    expect(parsed.hash).toBe("0123456789abcdef");
  });

  it("splits on the last separator, not the first", () => {
    const parsed = parseContainerTag("repo_a__b__0123456789abcdef");

    expect(parsed.name).toBe("a__b");
  });

  it("treats a hand-set tag as unnamed rather than guessing", () => {
    expect(parseContainerTag("my-own-tag")).toEqual({
      tag: "my-own-tag",
      name: "my-own-tag",
      hash: undefined,
      generated: false,
    });
  });

  it("rejects a tag whose hash is not 16 hex characters", () => {
    expect(parseContainerTag("repo_x__nothex").generated).toBe(false);
    expect(parseContainerTag("repo_x__cb4653b1d26a844").generated).toBe(false);
  });
});
