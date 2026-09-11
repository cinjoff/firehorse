import { useEffect, useRef } from "react";

interface SearchFieldProps {
  readonly query: string;
  readonly isSearching: boolean;
  readonly matchCount: number | undefined;
  readonly onSearch: (query: string) => void;
}

export function SearchField({ query, isSearching, matchCount, onSearch }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusOnShortcut(event: KeyboardEvent) {
      // The graph takes z, c, + and - globally with no opt-out, so the shell
      // stays on modified keys only.
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
      }

      if (event.key === "Escape" && document.activeElement === input.current) {
        input.current?.blur();
      }
    }

    window.addEventListener("keydown", focusOnShortcut);
    return () => window.removeEventListener("keydown", focusOnShortcut);
  }, []);

  return (
    <div className="search">
      <label className="search__field">
        <span className="visually-hidden">Search memories</span>
        <input
          ref={input}
          type="search"
          className="search__input"
          placeholder="Search memories"
          value={query}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => onSearch(event.target.value)}
        />
        <kbd className="search__hint" aria-hidden="true">
          ⌘K
        </kbd>
      </label>

      <p className="search__status" role="status">
        {isSearching
          ? "Searching…"
          : matchCount === undefined
            ? ""
            : matchCount === 0
              ? "No matches"
              : `${matchCount} highlighted`}
      </p>
    </div>
  );
}
