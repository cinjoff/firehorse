import type { GraphApiDocument, GraphApiMemory, MemoryRelation } from "@supermemory/memory-graph";

import { documentLabel } from "../shared/document-label.ts";
import type { DocumentWithMemories, MemoryEntry } from "../shared/types.ts";

/**
 * The server's document shape is not assignable to the graph's `documents`
 * prop — the graph wants `memories`, not `memoryEntries`, and requires a dozen
 * fields the server leaves off. This is the adapter #88 said would be needed
 * whichever version we built on.
 */

function text(value: string | null | undefined, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function timestamp(value: string | null | undefined): string {
  return text(value, new Date(0).toISOString());
}

function adaptMemory(entry: MemoryEntry, documentId: string): GraphApiMemory {
  // Narrowed to exclude undefined, which exactOptionalPropertyTypes rejects.
  const memoryRelations: Record<string, MemoryRelation> | null =
    (entry.memoryRelations as Record<string, MemoryRelation> | undefined) ?? null;

  return {
    id: entry.id,
    // The graph labels a node from `memory`, and so does the local server —
    // it sends no `content`, `summary` or `title` on a memory entry.
    memory: text(entry.memory, "Untitled memory"),
    content: entry.memory ?? null,
    isStatic: entry.isStatic ?? false,
    spaceId: text(entry.spaceId) || text(entry.spaceContainerTag) || documentId,
    isLatest: entry.isLatest ?? true,
    isForgotten: entry.isForgotten ?? false,
    forgetAfter: entry.forgetAfter ?? null,
    forgetReason: entry.forgetReason ?? null,
    version: entry.version ?? 1,
    parentMemoryId: entry.parentMemoryId ?? null,
    rootMemoryId: entry.rootMemoryId ?? null,
    createdAt: timestamp(entry.createdAt),
    updatedAt: timestamp(entry.updatedAt),
    memoryRelations,
    spaceContainerTag: entry.spaceContainerTag ?? null,
  };
}

export function adaptDocument(document: DocumentWithMemories): GraphApiDocument {
  return {
    id: document.id,
    // Captured transcripts carry the raw session text as a title.
    title: documentLabel(document),
    summary: document.summary ?? null,
    documentType: text(document.type, "text"),
    createdAt: timestamp(document.createdAt),
    updatedAt: timestamp(document.updatedAt),
    memories: (document.memoryEntries ?? []).map((entry) => adaptMemory(entry, document.id)),
  };
}

export function adaptDocuments(documents: readonly DocumentWithMemories[]): GraphApiDocument[] {
  return documents.map(adaptDocument);
}
