import { documentLabel } from "../shared/document-label.ts";
import { formatDay } from "../shared/format.ts";
import type { DocumentWithMemories } from "../shared/types.ts";

interface DetailPanelProps {
  readonly document: DocumentWithMemories | undefined;
  readonly onClose: () => void;
}

export function DetailPanel({ document, onClose }: DetailPanelProps) {
  if (!document) return null;

  const memories = document.memoryEntries ?? [];

  return (
    <aside className="detail" aria-label="Document detail">
      <header className="detail__head">
        <h2 className="detail__title">{documentLabel(document)}</h2>
        <button type="button" className="detail__close" onClick={onClose} aria-label="Close detail">
          ✕
        </button>
      </header>

      <dl className="detail__meta">
        <div>
          <dt>Type</dt>
          <dd>{document.type ?? "—"}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDay(document.createdAt)}</dd>
        </div>
        <div>
          <dt>Memories</dt>
          <dd>{memories.length}</dd>
        </div>
      </dl>

      {document.summary ? <p className="detail__summary">{document.summary}</p> : null}

      <p className="detail__label">Memories</p>

      <ul className="detail__memories">
        {memories.map((memory) => (
          <li key={memory.id} className="memory">
            <p className="memory__text">{memory.memory ?? "Empty memory"}</p>
            <p className="memory__meta">
              <span>{formatDay(memory.createdAt)}</span>
              {memory.isLatest === false ? <span className="memory__stale">superseded</span> : null}
            </p>
          </li>
        ))}
      </ul>

      {memories.length === 0 ? (
        <p className="detail__empty">
          This document produced no memories. Extraction may have failed, or there was nothing worth
          keeping in it.
        </p>
      ) : null}
    </aside>
  );
}
