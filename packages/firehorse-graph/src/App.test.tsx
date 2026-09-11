import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App.tsx";

// The graph renders to a canvas, which jsdom does not implement. The shell is
// what these tests are about, so it stands in as a marker.
vi.mock("@supermemory/memory-graph", () => ({
  MemoryGraph: ({ documents }: { documents: unknown[] }) => (
    <div data-testid="graph">{documents.length} nodes</div>
  ),
}));

const PROJECTS = [
  { tag: "repo_firehorse__cb4653b1d26a8449", name: "firehorse", documentCount: 8, memoryCount: 76 },
  {
    tag: "repo_konstantout__d741d7fc9f3749fc",
    name: "konstantout",
    documentCount: 1,
    memoryCount: 4,
  },
];

function respond(url: string): Response {
  if (url.startsWith("/api/projects")) {
    return new Response(JSON.stringify({ projects: PROJECTS }), { status: 200 });
  }

  return new Response(
    JSON.stringify({
      documents: [{ id: "doc-1", title: "A document", memoryEntries: [] }],
      pagination: { currentPage: 1, limit: 100, totalItems: 9, totalPages: 1 },
    }),
    { status: 200 },
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => respond(String(input))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("lists every project with its counts", async () => {
    render(<App />);

    expect(await screen.findByRole("button", { name: /firehorse/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /konstantout/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All projects/ })).toBeInTheDocument();
  });

  it("replaces the whole shell when supermemory is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "Cannot reach supermemory at http://x" }), {
            status: 503,
          }),
      ),
    );

    render(<App />);

    expect(await screen.findByText("Supermemory is not running")).toBeInTheDocument();
    // A working rail beside an empty canvas would claim the store is empty.
    expect(screen.queryByRole("navigation", { name: "Projects" })).not.toBeInTheDocument();
  });

  it("explains what creates memories when the store is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) =>
        String(input).startsWith("/api/projects")
          ? new Response(JSON.stringify({ projects: [] }), { status: 200 })
          : new Response(
              JSON.stringify({
                documents: [],
                pagination: { currentPage: 1, limit: 100, totalItems: 0, totalPages: 0 },
              }),
              { status: 200 },
            ),
      ),
    );

    render(<App />);

    expect(await screen.findByText("No memories yet")).toBeInTheDocument();
  });

  it("scopes a document request to the selected project", async () => {
    const { getByRole } = render(<App />);

    const project = await screen.findByRole("button", { name: /firehorse/ });
    project.click();

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
      expect(
        calls.some((url) => url.includes("containerTags=repo_firehorse__cb4653b1d26a8449")),
      ).toBe(true);
    });

    expect(getByRole("navigation", { name: "Projects" })).toBeInTheDocument();
  });

  it("reports how much of the store is loaded", async () => {
    render(<App />);

    expect(await screen.findByText(/1 of 9 documents/)).toBeInTheDocument();
  });
});
