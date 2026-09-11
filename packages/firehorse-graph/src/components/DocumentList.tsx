import { documentLabel } from "../shared/document-label.ts";
import type { DocumentWithMemories } from "../shared/types.ts";

interface DocumentListProps {
  readonly documents: readonly DocumentWithMemories[];
  readonly highlighted: readonly string[] | undefined;
  readonly selectedId: string | undefined;
  readonly onSelect: (id: string) => void;
}

/**
 * The audit view. A graph shows shape; a list shows whether the memories are
 * any good — which is the job the canvas cannot do.
 */
export function DocumentList({ documents, highlighted, selectedId, onSelect }: DocumentListProps) {
  const hits = highlighted ? new Set(highlighted) : undefined;

  return (
    <div className="list">
      <table className="list__table">
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col" className="list__number">
              Memories
            </th>
            <th scope="col">First memory</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => {
            const memories = document.memoryEntries ?? [];
            const first = memories[0];

            return (
              <tr
                key={document.id}
                className="list__row"
                aria-selected={document.id === selectedId}
                data-hit={hits ? hits.has(document.id) : undefined}
                onClick={() => onSelect(document.id)}
              >
                <td>
                  <button type="button" className="list__title">
                    {documentLabel(document)}
                  </button>
                </td>
                <td className="list__number">{memories.length}</td>
                <td className="list__excerpt">
                  {first?.memory ?? <span className="list__none">none</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
