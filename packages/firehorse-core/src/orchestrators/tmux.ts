import { BaseOrchestrator, type OrchestratorEnvironment } from "./orchestrator.js";
import type { OrchestratorCapabilities } from "../types.js";

/**
 * Plain tmux — detection keys off `TMUX` (set by tmux for child processes).
 * No worktree concept; just a multiplexed shell.
 */
export class TmuxOrchestrator extends BaseOrchestrator {
  readonly id = "tmux" as const;
  readonly displayName = "tmux";
  readonly capabilities: OrchestratorCapabilities = {
    worktrees: false,
    parallelAgents: true,
    portAssignment: false,
    sharedFilesystem: true,
  };

  detect(env: NodeJS.ProcessEnv = process.env): boolean {
    return Boolean(env["TMUX"]);
  }

  readEnvironment(env: NodeJS.ProcessEnv = process.env): OrchestratorEnvironment {
    return {
      ...(env["PWD"] && { workspacePath: env["PWD"] }),
    };
  }
}
