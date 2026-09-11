import type { GraphThemeColors } from "@supermemory/memory-graph";

/**
 * The graph ships a dark-only palette of its own. These override the parts that
 * would otherwise sit beside the shell's greys rather than inside them — the
 * field, the text ramp, and the one accent that means "selected".
 */
export const GRAPH_COLORS: Partial<GraphThemeColors> = {
  bg: "#0b0c0e",
  accent: "#6ea8fe",
  textPrimary: "#e8eaed",
  textSecondary: "#9aa1ad",
  textMuted: "#646c7a",
  popoverBg: "#131519",
  popoverBorder: "#252932",
  popoverTextPrimary: "#e8eaed",
  popoverTextSecondary: "#9aa1ad",
  popoverTextMuted: "#646c7a",
  controlBg: "#131519",
  controlBorder: "#252932",
};
