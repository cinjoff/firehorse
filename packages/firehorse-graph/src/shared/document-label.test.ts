import { describe, expect, it } from "vitest";

import { documentLabel } from "./document-label.ts";

describe("documentLabel", () => {
  it("labels a captured transcript by when its session ran", () => {
    const label = documentLabel({
      id: "d",
      title: "<|turn_start|>2026-09-11T14:49:46.657Z\n\n<|start|>user...",
    });

    expect(label).toMatch(/^Session — /);
    expect(label).not.toContain("turn_start");
  });

  it("prefers the transcript's own timestamp over the document's createdAt", () => {
    const label = documentLabel({
      id: "d",
      title: "<|turn_start|>2026-01-02T03:04:05.000Z\n\n<|start|>u",
      createdAt: "2030-12-25T00:00:00.000Z",
    });

    expect(label).toContain("Jan");
    expect(label).not.toContain("Dec");
  });

  it("falls back to createdAt when the transcript carries no timestamp", () => {
    const label = documentLabel({
      id: "d",
      title: "<|start|>user says hello",
      createdAt: "2026-03-04T05:06:07.000Z",
    });

    expect(label).toContain("Mar");
  });

  it("leaves a real title alone", () => {
    expect(documentLabel({ id: "d", title: "docs/ARCHITECTURE.md" })).toBe("docs/ARCHITECTURE.md");
  });

  it("does not mistake prose about transcripts for a transcript", () => {
    const title = "Notes on turn_start handling";

    expect(documentLabel({ id: "d", title })).toBe(title);
  });

  it("names an untitled document rather than rendering nothing", () => {
    expect(documentLabel({ id: "d" })).toBe("Untitled document");
    expect(documentLabel({ id: "d", title: "   " })).toBe("Untitled document");
  });

  it("says Session when a transcript has no usable time anywhere", () => {
    expect(documentLabel({ id: "d", title: "<|start|>u" })).toBe("Session");
  });
});
