import type { SupermemoryClient } from "./supermemory.ts";
import { SupermemoryError, SupermemoryUnreachableError } from "./supermemory.ts";

export interface ApiResult {
  readonly status: number;
  readonly body: unknown;
}

function parseList(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const tags = value.split(",").filter((tag) => tag.length > 0);
  return tags.length > 0 ? tags : undefined;
}

function parseCount(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Routes `/api/*` to supermemory. Returns a result rather than writing to a
 * response, so the whole surface is testable without a socket.
 *
 * Returns undefined for anything that is not an API path — the caller then
 * serves static files or the SPA shell.
 */
export async function handleApiRequest(
  url: URL,
  client: SupermemoryClient,
): Promise<ApiResult | undefined> {
  if (!url.pathname.startsWith("/api/")) return undefined;

  try {
    switch (url.pathname) {
      case "/api/health": {
        const projects = await client.listProjects();
        return { status: 200, body: { ok: true, projects: projects.length } };
      }

      case "/api/projects": {
        return { status: 200, body: { projects: await client.listProjects() } };
      }

      case "/api/documents": {
        const containerTags = parseList(url.searchParams.get("containerTags"));

        return {
          status: 200,
          body: await client.listDocuments({
            page: parseCount(url.searchParams.get("page"), 1),
            limit: parseCount(url.searchParams.get("limit"), 100),
            ...(containerTags ? { containerTags } : {}),
          }),
        };
      }

      case "/api/search": {
        const query = url.searchParams.get("q");
        const containerTags = parseList(url.searchParams.get("containerTags"));

        if (!query) {
          return { status: 400, body: { error: "Missing required query parameter q." } };
        }

        // An unscoped search silently returns nothing (#87), so refuse it
        // rather than hand back an empty result that looks like "no matches".
        if (!containerTags) {
          return {
            status: 400,
            body: {
              error: "Missing required query parameter containerTags.",
              detail:
                "supermemory returns zero results for an unscoped search, so a scope must be chosen.",
            },
          };
        }

        return {
          status: 200,
          body: { documentIds: await client.searchDocumentIds({ query, containerTags }) },
        };
      }

      default:
        return { status: 404, body: { error: `No API route ${url.pathname}.` } };
    }
  } catch (error) {
    if (error instanceof SupermemoryUnreachableError) {
      return {
        status: 503,
        body: { error: error.message, detail: "The graph has no data source until it is running." },
      };
    }

    if (error instanceof SupermemoryError) {
      return { status: 502, body: { error: error.message, detail: error.detail } };
    }

    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : "Unknown error." },
    };
  }
}
