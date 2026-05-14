import { BaseOrchestrator, type OrchestratorEnvironment } from "./orchestrator.js";
import type { OrchestratorCapabilities } from "../types.js";

/**
 * Plain terminal — fallback when no other orchestrator is detected.
 * `detect()` always returns true; resolve order in the registry decides
 * whether it wins.
 */
export class TerminalOrchestrator extends BaseOrchestrator {
  readonly id = "terminal" as const;
  readonly displayName = "Terminal";
  readonly capabilities: OrchestratorCapabilities = {
    worktrees: false,
    parallelAgents: false,
    portAssignment: false,
    sharedFilesystem: true,
  };

  detect(): boolean {
    return true;
  }

  readEnvironment(env: NodeJS.ProcessEnv = process.env): OrchestratorEnvironment {
    return {
      ...(env["PWD"] && { workspacePath: env["PWD"] }),
    };
  }
}
