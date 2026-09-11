import { describe, expect, it, vi } from "vitest";

import { resolveServerConfig } from "./config.ts";
import { handleApiRequest } from "./routes.ts";
import {
  createSupermemoryClient,
  SupermemoryUnreachableError,
  type FetchLike,
} from "./supermemory.ts";

const config = resolveServerConfig({ env: {}, home: "/nonexistent", readFile: () => "" });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function client(fetchImpl: FetchLike) {
  return createSupermemoryClient(config, fetchImpl);
}

describe("listProjects", () => {
  it("names a project from its container tag without a lookup", async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValue(
        jsonResponse([
          { containerTag: "repo_firehorse__cb4653b1d26a8449", documentCount: 12, memoryCount: 70 },
        ]),
      );

    const projects = await client(fetchImpl).listProjects();

    expect(projects).toEqual([
      {
        tag: "repo_firehorse__cb4653b1d26a8449",
        name: "firehorse",
        documentCount: 12,
        memoryCount: 70,
      },
    ]);
  });

  it("falls back to the raw tag when it was set by hand", async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse([{ containerTag: "my-own-tag" }]));

    const [project] = await client(fetchImpl).listProjects();

    expect(project?.name).toBe("my-own-tag");
    expect(project?.documentCount).toBe(0);
  });

  it("reads the bare array the local server sends, not an envelope", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ tags: [] }));

    await expect(client(fetchImpl).listProjects()).resolves.toEqual([]);
  });
});

describe("listDocuments", () => {
  it("reads currentPage, which is the local server's spelling of page", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        documents: [{ id: "doc-1" }],
        pagination: { currentPage: 3, limit: 25, totalItems: 60, totalPages: 3 },
      }),
    );

    const { pagination } = await client(fetchImpl).listDocuments({ page: 3, limit: 25 });

    expect(pagination).toEqual({ currentPage: 3, limit: 25, totalItems: 60, totalPages: 3 });
  });

  it("always sends a sort the server accepts", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ documents: [] }));

    await client(fetchImpl).listDocuments({});

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body.sort).toBe("createdAt");
  });

  it("omits containerTags entirely when no project is selected", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ documents: [] }));

    await client(fetchImpl).listDocuments({});

    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).not.toHaveProperty(
      "containerTags",
    );
  });
});

describe("document payload", () => {
  it("drops content, which is the whole session transcript and nothing renders", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        documents: [
          {
            id: "doc-1",
            title: "A session",
            summary: "What it was about",
            content: "…80 KB of transcript…",
          },
        ],
      }),
    );

    const { documents } = await client(fetchImpl).listDocuments({});

    expect(documents[0]).not.toHaveProperty("content");
    // Everything the browser actually reads survives.
    expect(documents[0]).toMatchObject({
      id: "doc-1",
      title: "A session",
      summary: "What it was about",
    });
  });

  it("leaves a document without content untouched", async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ documents: [{ id: "doc-1", title: "t" }] }));

    const { documents } = await client(fetchImpl).listDocuments({});

    expect(documents[0]).toEqual({ id: "doc-1", title: "t" });
  });

  it("keeps memoryEntries, which is the thing being drawn", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        documents: [{ id: "d", content: "big", memoryEntries: [{ id: "m", memory: "x" }] }],
      }),
    );

    const { documents } = await client(fetchImpl).listDocuments({});

    expect(documents[0]?.memoryEntries).toHaveLength(1);
  });
});

describe("authorization", () => {
  it("sends no Authorization header when there is no key", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse([]));

    await client(fetchImpl).listProjects();

    const headers = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("sends a bearer token when a key is configured", async () => {
    const withKey = resolveServerConfig({
      env: { SUPERMEMORY_API_KEY: "sm-test-key" },
      home: "/nonexistent",
      readFile: () => "",
    });
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse([]));

    await createSupermemoryClient(withKey, fetchImpl).listProjects();

    const headers = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sm-test-key");
  });
});

describe("searchDocumentIds", () => {
  it("remaps a customId hit onto the document's real id", async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) => {
      if (input.endsWith("/v3/search")) {
        return jsonResponse({ results: [{ documentId: "anchor-architecture" }] });
      }
      return jsonResponse({
        documents: [
          { id: "doc-real-1", customId: "anchor-architecture" },
          { id: "doc-real-2", customId: "anchor-domain" },
        ],
      });
    });

    const ids = await client(fetchImpl).searchDocumentIds({
      query: "architecture",
      containerTags: ["repo_firehorse__cb4653b1d26a8449"],
    });

    expect(ids).toEqual(["doc-real-1"]);
  });

  it("does not fetch documents when nothing matched", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ results: [] }));

    await client(fetchImpl).searchDocumentIds({ query: "nothing", containerTags: ["t"] });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("unreachable supermemory", () => {
  it("is a 503 naming the URL, not an empty graph", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await handleApiRequest(
      new URL("http://localhost/api/projects"),
      client(fetchImpl),
    );

    expect(result?.status).toBe(503);
    expect(String((result?.body as { error: string }).error)).toContain("http://localhost:6767");
  });

  it("is thrown as a typed error by the client", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(client(fetchImpl).listProjects()).rejects.toBeInstanceOf(
      SupermemoryUnreachableError,
    );
  });

  it("passes a supermemory error through as a 502", async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ error: "bad sort" }, 400));

    const result = await handleApiRequest(
      new URL("http://localhost/api/documents"),
      client(fetchImpl),
    );

    expect(result?.status).toBe(502);
  });
});

describe("routing", () => {
  it("refuses an unscoped search rather than returning a misleading zero", async () => {
    const fetchImpl = vi.fn<FetchLike>();

    const result = await handleApiRequest(
      new URL("http://localhost/api/search?q=anything"),
      client(fetchImpl),
    );

    expect(result?.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requires a query", async () => {
    const result = await handleApiRequest(
      new URL("http://localhost/api/search?containerTags=t"),
      client(vi.fn<FetchLike>()),
    );

    expect(result?.status).toBe(400);
  });

  it("leaves non-API paths to the static handler", async () => {
    const result = await handleApiRequest(
      new URL("http://localhost/assets/index.js"),
      client(vi.fn<FetchLike>()),
    );

    expect(result).toBeUndefined();
  });

  it("404s an unknown API route", async () => {
    const result = await handleApiRequest(
      new URL("http://localhost/api/nope"),
      client(vi.fn<FetchLike>()),
    );

    expect(result?.status).toBe(404);
  });
});
