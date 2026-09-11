import { formatMinute } from "./format.ts";
import type { DocumentWithMemories } from "./types.ts";

/**
 * Documents captured from a coding session carry the raw transcript as their
 * title — `<|turn_start|>2026-09-11T14:49:46.657Z\n\n<|start|>u…`. Rendering
 * that verbatim makes the primary column unreadable and identifies nothing, so
 * a transcript gets a label built from what it actually is: a session, and when.
 */

const TRANSCRIPT = /<\|turn_start\|>|<\|start\|>|<\|end\|>/;
const LEADING_TIMESTAMP = /<\|turn_start\|>\s*(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/;

export function documentLabel(document: DocumentWithMemories): string {
  const title = document.title?.trim();

  if (!title) return "Untitled document";
  if (!TRANSCRIPT.test(title)) return title;

  // Prefer the timestamp inside the transcript itself; it is when the session
  // ran, which is what someone scanning the list is looking for.
  const stamped = LEADING_TIMESTAMP.exec(title)?.[1];
  const when = formatMinute(stamped) ?? formatMinute(document.createdAt);

  return when ? `Session — ${when}` : "Session";
}
