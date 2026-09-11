import { describe, expect, it } from "vitest";

import { adaptDocument } from "./adapt.ts";

/**
 * These lock the local server's observed field names. The hosted docs describe
 * a memory entry carrying `content`, `summary` and `title`; the self-hosted
 * server sends none of those and puts the text in `memory`. Reading the wrong
 * field renders every node as "Untitled memory", which is how this was found.
 */
describe("adaptDocument", () => {
  it("reads the memory text from `memory`, the field the server actually sends", () => {
    const [memory] = adaptDocument({
      id: "doc-1",
      memoryEntries: [{ id: "mem-1", memory: "The server binds port 6767." }],
    }).memories;

    expect(memory?.memory).toBe("The server binds port 6767.");
  });

  it("passes real version and lineage through instead of synthesising them", () => {
    const [memory] = adaptDocument({
      id: "doc-1",
      memoryEntries: [
        {
          id: "mem-1",
          memory: "text",
          version: 3,
          parentMemoryId: "mem-0",
          rootMemoryId: "mem-root",
          isForgotten: true,
          isStatic: true,
          isLatest: false,
        },
      ],
    }).memories;

    expect(memory).toMatchObject({
      version: 3,
      parentMemoryId: "mem-0",
      rootMemoryId: "mem-root",
      isForgotten: true,
      isStatic: true,
      isLatest: false,
    });
  });

  it("renames memoryEntries to the memories the graph prop expects", () => {
    const adapted = adaptDocument({ id: "doc-1", memoryEntries: [{ id: "m", memory: "x" }] });

    expect(adapted.memories).toHaveLength(1);
    expect(adapted).not.toHaveProperty("memoryEntries");
  });

  it("survives a document with no memories at all", () => {
    expect(adaptDocument({ id: "doc-1" }).memories).toEqual([]);
  });

  it("never emits undefined for memoryRelations", () => {
    const [memory] = adaptDocument({ id: "d", memoryEntries: [{ id: "m", memory: "x" }] }).memories;

    expect(memory?.memoryRelations).toBeNull();
  });
});
