import { ALL_PROJECTS } from "../useStore.ts";
import type { Project } from "../shared/types.ts";

export type ViewMode = "graph" | "list";

interface ProjectRailProps {
  readonly projects: readonly Project[];
  readonly selectedTag: string;
  readonly view: ViewMode;
  readonly onSelect: (tag: string) => void;
  readonly onViewChange: (view: ViewMode) => void;
}

export function ProjectRail({
  projects,
  selectedTag,
  view,
  onSelect,
  onViewChange,
}: ProjectRailProps) {
  const documentTotal = projects.reduce((sum, project) => sum + project.documentCount, 0);
  const memoryTotal = projects.reduce((sum, project) => sum + project.memoryCount, 0);

  return (
    <nav className="rail" aria-label="Projects">
      <p className="rail__label">Projects</p>

      <ul className="rail__list">
        <li>
          <button
            type="button"
            className="rail__item"
            aria-current={selectedTag === ALL_PROJECTS}
            onClick={() => onSelect(ALL_PROJECTS)}
          >
            <span className="rail__name">All projects</span>
            <span className="rail__counts">
              <span>{documentTotal}</span>
              <span>{memoryTotal}</span>
            </span>
          </button>
        </li>

        {projects.map((project) => (
          <li key={project.tag}>
            <button
              type="button"
              className="rail__item"
              aria-current={selectedTag === project.tag}
              onClick={() => onSelect(project.tag)}
              title={project.tag}
            >
              <span className="rail__name">{project.name}</span>
              <span className="rail__counts">
                <span>{project.documentCount}</span>
                <span>{project.memoryCount}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="rail__legend">
        <span>docs</span>
        <span>memories</span>
      </p>

      <p className="rail__label rail__label--view">View</p>

      <div className="rail__views" role="group" aria-label="View">
        <button
          type="button"
          className="rail__item"
          aria-current={view === "graph"}
          onClick={() => onViewChange("graph")}
        >
          <span className="rail__name">Graph</span>
        </button>
        <button
          type="button"
          className="rail__item"
          aria-current={view === "list"}
          onClick={() => onViewChange("list")}
        >
          <span className="rail__name">List</span>
        </button>
      </div>
    </nav>
  );
}
