import { parseContainerTag } from "../src/shared/container-tags.ts";
import type {
  DocumentsResponse,
  DocumentWithMemories,
  Pagination,
  Project,
} from "../src/shared/types.ts";
import type { ServerConfig } from "./config.ts";

/** The supermemory server answered, but not with success. */
export class SupermemoryError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "SupermemoryError";
  }
}

/** The supermemory server could not be reached at all. */
export class SupermemoryUnreachableError extends Error {
  constructor(
    readonly apiUrl: string,
    override readonly cause: unknown,
  ) {
    super(
      `Cannot reach supermemory at ${apiUrl}. Start it, or point SUPERMEMORY_API_URL somewhere else.`,
    );
    this.name = "SupermemoryUnreachableError";
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface SupermemoryClient {
  listProjects(): Promise<readonly Project[]>;
  listDocuments(options: ListDocumentsOptions): Promise<DocumentsResponse>;
  searchDocumentIds(options: SearchOptions): Promise<readonly string[]>;
}

export interface ListDocumentsOptions {
  readonly page?: number;
  readonly limit?: number;
  /** Omit to read every project at once. */
  readonly containerTags?: readonly string[];
}

export interface SearchOptions {
  readonly query: string;
  /**
   * Required in practice. #87 found an unscoped search returns zero results,
   * silently — so the caller must always pick a scope.
   */
  readonly containerTags: readonly string[];
}

const DEFAULT_LIMIT = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * `content` is the document's full text — a whole session transcript — and the
 * server sends it whether or not you ask (#87 measured 81 KB for 8 documents,
 * and `includeContent: false` does not suppress it). Nothing in the browser
 * renders it: the graph draws memories, and the detail panel reads `summary`.
 * So it is dropped here rather than shipped and ignored.
 */
function stripContent(document: DocumentWithMemories): DocumentWithMemories {
  if (document.content === undefined) return document;

  const { content: _content, ...rest } = document;

  return rest;
}

export function createSupermemoryClient(
  config: ServerConfig,
  fetchImpl: FetchLike = fetch,
): SupermemoryClient {
  async function call(path: string, init?: RequestInit): Promise<unknown> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // #87: no header is accepted, a wrong one is a 401. Only send a real key.
    if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

    let response: Response;

    try {
      response = await fetchImpl(`${config.apiUrl}${path}`, { ...init, headers });
    } catch (cause) {
      throw new SupermemoryUnreachableError(config.apiUrl, cause);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new SupermemoryError(
        `supermemory returned ${response.status} for ${path}`,
        response.status,
        detail.slice(0, 500),
      );
    }

    return response.json();
  }

  return {
    /** `GET /v3/container-tags/list` returns a bare array, not an envelope. */
    async listProjects() {
      const body = await call("/v3/container-tags/list", { method: "GET" });

      if (!Array.isArray(body)) return [];

      return body.flatMap((entry): Project[] => {
        if (!isRecord(entry)) return [];

        const tag = asString(entry["containerTag"]) ?? asString(entry["tag"]);
        if (!tag) return [];

        return [
          {
            tag,
            name: parseContainerTag(tag).name,
            documentCount: asCount(entry["documentCount"]),
            memoryCount: asCount(entry["memoryCount"]),
          },
        ];
      });
    },

    async listDocuments(options) {
      const page = options.page ?? 1;
      const limit = options.limit ?? DEFAULT_LIMIT;

      const body = await call("/v3/documents/documents", {
        method: "POST",
        body: JSON.stringify({
          page,
          limit,
          // #87: `sort` only accepts createdAt/updatedAt; anything else is a 400.
          sort: "createdAt",
          order: "desc",
          ...(options.containerTags?.length ? { containerTags: options.containerTags } : {}),
        }),
      });

      const documents =
        isRecord(body) && Array.isArray(body["documents"])
          ? (body["documents"] as DocumentWithMemories[]).map(stripContent)
          : [];

      const raw = isRecord(body) && isRecord(body["pagination"]) ? body["pagination"] : {};

      const pagination: Pagination = {
        // #87: the local server spells this `currentPage`, not `page`.
        currentPage: asCount(raw["currentPage"]) || page,
        limit: asCount(raw["limit"]) || limit,
        totalItems: asCount(raw["totalItems"]),
        totalPages: asCount(raw["totalPages"]),
      };

      return { documents, pagination };
    },

    /**
     * Search reports a document's `customId` as `documentId` (#87), which is
     * not the `id` the graph highlights by — so hits are remapped through the
     * documents in scope before they leave this client.
     */
    async searchDocumentIds(options) {
      const body = await call("/v3/search", {
        method: "POST",
        body: JSON.stringify({ q: options.query, containerTags: options.containerTags }),
      });

      const results = isRecord(body) && Array.isArray(body["results"]) ? body["results"] : [];

      const hits = new Set(
        results.flatMap((result): string[] => {
          if (!isRecord(result)) return [];
          const id = asString(result["documentId"]);
          return id ? [id] : [];
        }),
      );

      if (hits.size === 0) return [];

      const { documents } = await this.listDocuments({
        containerTags: options.containerTags,
        limit: 500,
      });

      return documents
        .filter((document) => {
          const customId = asString(document.customId);
          return hits.has(document.id) || (customId !== undefined && hits.has(customId));
        })
        .map((document) => document.id);
    },
  };
}
