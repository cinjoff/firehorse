import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, fetchDocuments, fetchProjects, fetchSearch } from "./api/client.ts";
import { ALL_PROJECTS, scopeToContainerTags } from "./shared/scope.ts";
import type { DocumentWithMemories, Project } from "./shared/types.ts";

const PAGE_SIZE = 100;

export interface StoreState {
  readonly projects: readonly Project[];
  readonly documents: readonly DocumentWithMemories[];
  readonly selectedTag: string;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly totalItems: number;
  readonly error: ApiError | Error | undefined;
  readonly query: string;
  readonly matches: readonly string[] | undefined;
  readonly isSearching: boolean;
}

/**
 * One hook holds the whole shell's state. The app is small enough that a store
 * library would be ceremony, and keeping fetches in one place makes the
 * project/search interaction — a search is always scoped to the selection —
 * visible rather than spread across components.
 */
export function useStore() {
  const [projects, setProjects] = useState<readonly Project[]>([]);
  const [documents, setDocuments] = useState<readonly DocumentWithMemories[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>(ALL_PROJECTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<ApiError | Error | undefined>(undefined);

  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<readonly string[] | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);

  // Guards against a slow response for an abandoned project overwriting a newer one.
  const requestId = useRef(0);

  useEffect(() => {
    let live = true;

    fetchProjects()
      .then(({ projects: loaded }) => live && setProjects(loaded))
      .catch((cause: unknown) => live && setError(cause as Error));

    return () => {
      live = false;
    };
  }, []);

  /**
   * Both the first page and every later one load through here. They differ only
   * in whether the result replaces what is on screen or extends it, and which
   * loading flag they raise.
   */
  const loadPage = useCallback(
    (options: { page: number; tag: string; append: boolean; id: number }) => {
      const setBusy = options.append ? setIsLoadingMore : setIsLoading;

      setBusy(true);

      fetchDocuments({
        page: options.page,
        limit: PAGE_SIZE,
        containerTags: scopeToContainerTags(options.tag),
      })
        .then((response) => {
          if (options.id !== requestId.current) return;

          setDocuments((previous) =>
            options.append ? [...previous, ...response.documents] : response.documents,
          );
          setPage(response.pagination.currentPage);
          setTotalPages(response.pagination.totalPages);
          setTotalItems(response.pagination.totalItems);
        })
        .catch((cause: unknown) => {
          if (options.id === requestId.current) setError(cause as Error);
        })
        .finally(() => {
          if (options.id === requestId.current) setBusy(false);
        });
    },
    [],
  );

  useEffect(() => {
    const id = ++requestId.current;

    setError(undefined);
    loadPage({ page: 1, tag: selectedTag, append: false, id });
  }, [selectedTag, loadPage]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || page >= totalPages) return;

    loadPage({ page: page + 1, tag: selectedTag, append: true, id: requestId.current });
  }, [isLoadingMore, page, totalPages, selectedTag, loadPage]);

  const search = useCallback(
    (nextQuery: string) => {
      setQuery(nextQuery);

      if (nextQuery.trim().length === 0) {
        setMatches(undefined);
        return;
      }

      // Search is always scoped — an unscoped one silently returns nothing.
      const scope = scopeToContainerTags(selectedTag, projects);

      if (scope.length === 0) return;

      setIsSearching(true);

      fetchSearch(nextQuery, scope)
        .then(({ documentIds }) => setMatches(documentIds))
        .catch(() => setMatches([]))
        .finally(() => setIsSearching(false));
    },
    [projects, selectedTag],
  );

  const state: StoreState = useMemo(
    () => ({
      projects,
      documents,
      selectedTag,
      isLoading,
      isLoadingMore,
      hasMore: page < totalPages,
      totalItems,
      error,
      query,
      matches,
      isSearching,
    }),
    [
      projects,
      documents,
      selectedTag,
      isLoading,
      isLoadingMore,
      page,
      totalPages,
      totalItems,
      error,
      query,
      matches,
      isSearching,
    ],
  );

  return { state, selectProject: setSelectedTag, loadMore, search };
}
