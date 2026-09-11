import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App.tsx";

/**
 * The live store holds fewer documents than one page, so pagination never
 * fires against it. These drive it with a store big enough to need a second
 * page — otherwise the load-more wiring ships unexercised.
 */

let loadMore: (() => void) | undefined;

vi.mock("@supermemory/memory-graph", () => ({
  MemoryGraph: ({
    documents,
    hasMore,
    onLoadMore,
    totalCount,
  }: {
    documents: unknown[];
    hasMore?: boolean;
    onLoadMore?: () => void;
    totalCount?: number;
  }) => {
    loadMore = onLoadMore;
    return (
      <div data-testid="graph" data-has-more={String(hasMore)} data-total={totalCount}>
        {documents.length}
      </div>
    );
  },
}));

const PROJECTS = [
  { tag: "repo_a__0123456789abcdef", name: "a", documentCount: 250, memoryCount: 900 },
];

function page(number: number) {
  return {
    documents: Array.from({ length: 100 }, (_, index) => ({
      id: `p${number}-doc-${index}`,
      title: `Document ${number}.${index}`,
      memoryEntries: [],
    })),
    pagination: { currentPage: number, limit: 100, totalItems: 250, totalPages: 3 },
  };
}

beforeEach(() => {
  loadMore = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = String(input);

      if (url.startsWith("/api/projects")) {
        return new Response(JSON.stringify({ projects: PROJECTS }), { status: 200 });
      }

      const requested = Number(new URL(url, "http://x").searchParams.get("page") ?? "1");
      return new Response(JSON.stringify(page(requested)), { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pagination", () => {
  it("tells the graph more pages exist", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByTestId("graph")).toHaveAttribute("data-has-more", "true"),
    );
    expect(screen.getByTestId("graph")).toHaveAttribute("data-total", "250");
  });

  it("appends the next page rather than replacing what is loaded", async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("100"));

    loadMore?.();

    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("200"));
    expect(await screen.findByText(/200 of 250 documents/)).toBeInTheDocument();
  });

  it("stops offering more once the last page is in", async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("100"));

    loadMore?.();
    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("200"));
    loadMore?.();
    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("300"));

    expect(screen.getByTestId("graph")).toHaveAttribute("data-has-more", "false");
  });

  it("resets to the first page when the project changes", async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("100"));
    loadMore?.();
    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("200"));

    (await screen.findByRole("button", { name: /^a/ })).click();

    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("100"));
  });
});
