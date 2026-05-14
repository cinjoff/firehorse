import type { Orchestrator } from "./orchestrator.js";
import { SupersetOrchestrator } from "./superset.js";
import { ConductorOrchestrator } from "./conductor.js";
import { TmuxOrchestrator } from "./tmux.js";
import { TerminalOrchestrator } from "./terminal.js";

/**
 * Resolution order: orchestrator-specific (Superset, Conductor) before
 * generic (tmux), then `terminal` as the always-matching fallback. The first
 * adapter whose `detect()` returns true wins.
 */
export const orchestratorChain: Orchestrator[] = [
  new SupersetOrchestrator(),
  new ConductorOrchestrator(),
  new TmuxOrchestrator(),
  new TerminalOrchestrator(),
];

export function detectOrchestrator(env: NodeJS.ProcessEnv = process.env): Orchestrator {
  for (const o of orchestratorChain) {
    if (o.detect(env)) return o;
  }
  // TerminalOrchestrator.detect always returns true, so this is unreachable,
  // but TypeScript needs a concrete return.
  return new TerminalOrchestrator();
}
