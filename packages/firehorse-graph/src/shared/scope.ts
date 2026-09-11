import type { Project } from "./types.ts";

/**
 * The selected scope is either one container tag or every project at once.
 * `ALL_PROJECTS` is the sentinel for the latter; it can never collide with a
 * real tag, which is always `repo_…__<hash>` or something a user set by hand.
 */
export const ALL_PROJECTS = "all";

/**
 * Turns a selection into the container tags a request should carry.
 *
 * Listing documents takes an empty list to mean "every project", so the
 * unscoped case needs nothing. Search does not — an unscoped search silently
 * returns zero results — so it passes the known projects and gets every tag
 * back instead.
 */
export function scopeToContainerTags(
  selectedTag: string,
  projects: readonly Project[] = [],
): readonly string[] {
  if (selectedTag !== ALL_PROJECTS) return [selectedTag];

  return projects.map((project) => project.tag);
}
