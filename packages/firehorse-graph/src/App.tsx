import { MemoryGraph } from "@supermemory/memory-graph";
import { useMemo, useState } from "react";

import { adaptDocuments } from "./api/adapt.ts";
import { ApiError } from "./api/client.ts";
import { DetailPanel } from "./components/DetailPanel.tsx";
import { DocumentList } from "./components/DocumentList.tsx";
import { Message } from "./components/Message.tsx";
import { ProjectRail, type ViewMode } from "./components/ProjectRail.tsx";
import { SearchField } from "./components/SearchField.tsx";
import { GRAPH_COLORS } from "./graph-theme.ts";
import { ALL_PROJECTS } from "./shared/scope.ts";
import { useStore } from "./useStore.ts";

export function App() {
  const { state, selectProject, loadMore, search } = useStore();
  const [view, setView] = useState<ViewMode>("graph");
  const [openId, setOpenId] = useState<string | undefined>(undefined);

  const graphDocuments = useMemo(() => adaptDocuments(state.documents), [state.documents]);
  const openDocument = state.documents.find((document) => document.id === openId);

  // A failure to reach supermemory replaces the shell. An empty graph beside a
  // working set of controls would claim the store is empty, which is a lie.
  if (state.error instanceof ApiError && state.error.status === 503) {
    return (
      <div className="app app--message">
        <Message title="Supermemory is not running">
          <p>{state.error.message}</p>
          <p>
            Start it, then reload. The graph reads from <code>SUPERMEMORY_API_URL</code>, which
            defaults to <code>http://localhost:6767</code>.
          </p>
        </Message>
      </div>
    );
  }

  const noProjects = !state.isLoading && state.projects.length === 0;

  return (
    <div className="app">
      <ProjectRail
        projects={state.projects}
        selectedTag={state.selectedTag}
        view={view}
        onSelect={(tag) => {
          selectProject(tag);
          setOpenId(undefined);
        }}
        onViewChange={setView}
      />

      <main className="main">
        <header className="bar">
          <SearchField
            query={state.query}
            isSearching={state.isSearching}
            matchCount={state.matches?.length}
            onSearch={search}
          />
          <p className="bar__count">
            {state.isLoading
              ? "Loading…"
              : `${state.documents.length} of ${state.totalItems} documents`}
            {state.selectedTag === ALL_PROJECTS ? "" : " in this project"}
          </p>
        </header>

        <div className="canvas">
          {noProjects ? (
            <Message title="No memories yet">
              <p>
                Supermemory is running but has stored nothing. Memories are written as you work —
                each coding session extracts what it learned into the store for the repo it ran in.
              </p>
            </Message>
          ) : view === "graph" ? (
            <MemoryGraph
              documents={graphDocuments}
              isLoading={state.isLoading}
              isLoadingMore={state.isLoadingMore}
              hasMore={state.hasMore}
              onLoadMore={loadMore}
              totalCount={state.totalItems}
              variant="console"
              colors={GRAPH_COLORS}
              highlightDocumentIds={state.matches ? [...state.matches] : []}
              highlightsVisible={state.matches !== undefined}
              onOpenDocument={setOpenId}
            >
              <Message title="Nothing to draw">
                <p>This project has no documents yet.</p>
              </Message>
            </MemoryGraph>
          ) : (
            <DocumentList
              documents={state.documents}
              highlighted={state.matches}
              selectedId={openId}
              onSelect={setOpenId}
            />
          )}
        </div>
      </main>

      <DetailPanel document={openDocument} onClose={() => setOpenId(undefined)} />
    </div>
  );
}
