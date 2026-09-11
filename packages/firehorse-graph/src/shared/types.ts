/**
 * The shapes the proxy speaks to the browser. These are the local server's
 * observed shapes (https://github.com/cinjoff/firehorse/issues/87), not the
 * hosted API's documented ones — where they differ, local wins.
 */

export interface MemoryEntry {
  readonly id: string;
  /** The memory text. The local server calls this `memory`, not `content`. */
  readonly memory?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly spaceContainerTag?: string | null;
  readonly spaceId?: string | null;
  readonly isLatest?: boolean;
  readonly isStatic?: boolean;
  readonly isForgotten?: boolean;
  readonly forgetAfter?: string | null;
  readonly forgetReason?: string | null;
  readonly version?: number;
  readonly parentMemoryId?: string | null;
  readonly rootMemoryId?: string | null;
  /**
   * The local server sends an object here, not the `relation` string the
   * hosted docs describe. It was empty on every entry in the store when #87
   * measured it, so there are no memory-to-memory edges to draw yet.
   */
  readonly memoryRelations?: Record<string, unknown> | null;
}

export interface DocumentWithMemories {
  readonly id: string;
  readonly customId?: string | null;
  readonly title?: string | null;
  readonly content?: string | null;
  readonly summary?: string | null;
  readonly url?: string | null;
  readonly source?: string | null;
  readonly type?: string | null;
  readonly status?: string;
  readonly metadata?: Record<string, unknown> | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly memoryEntries?: readonly MemoryEntry[];
}

/** Note `currentPage`, not `page` — the local server's spelling. */
export interface Pagination {
  readonly currentPage: number;
  readonly limit: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface DocumentsResponse {
  readonly documents: readonly DocumentWithMemories[];
  readonly pagination: Pagination;
}

export interface Project {
  readonly tag: string;
  readonly name: string;
  readonly documentCount: number;
  readonly memoryCount: number;
}

export interface ProjectsResponse {
  readonly projects: readonly Project[];
}

export interface SearchResponse {
  /** Document `id`s, already remapped from the `customId`s search returns. */
  readonly documentIds: readonly string[];
}
