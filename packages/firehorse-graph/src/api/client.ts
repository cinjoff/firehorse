import type { DocumentsResponse, ProjectsResponse, SearchResponse } from "../shared/types.ts";

/** The proxy answered with an error we can show the user verbatim. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path);
  const body: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const { error, detail } =
      typeof body === "object" && body !== null
        ? (body as { error?: string; detail?: string })
        : {};

    throw new ApiError(error ?? `Request to ${path} failed.`, response.status, detail);
  }

  return body as T;
}

export function fetchProjects(): Promise<ProjectsResponse> {
  return get("/api/projects");
}

export function fetchDocuments(options: {
  page: number;
  limit: number;
  /** Omit or leave empty to read every project at once. */
  containerTags: readonly string[];
}): Promise<DocumentsResponse> {
  const params = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
  });

  if (options.containerTags.length > 0) {
    params.set("containerTags", options.containerTags.join(","));
  }

  return get(`/api/documents?${params.toString()}`);
}

export function fetchSearch(
  query: string,
  containerTags: readonly string[],
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, containerTags: containerTags.join(",") });

  return get(`/api/search?${params.toString()}`);
}
