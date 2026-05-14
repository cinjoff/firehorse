import { BaseOrchestrator, type OrchestratorEnvironment } from "./orchestrator.js";
import type { OrchestratorCapabilities } from "../types.js";

/**
 * Superset (superset.sh) — worktree-based orchestrator. Detection keys off
 * `SUPERSET_WORKSPACE_NAME` / `SUPERSET_ROOT_PATH`.
 */
export class SupersetOrchestrator extends BaseOrchestrator {
  readonly id = "superset" as const;
  readonly displayName = "Superset";
  readonly capabilities: OrchestratorCapabilities = {
    worktrees: true,
    parallelAgents: true,
    portAssignment: true,
    sharedFilesystem: true,
  };

  detect(env: NodeJS.ProcessEnv = process.env): boolean {
    return Boolean(env["SUPERSET_WORKSPACE_NAME"] ?? env["SUPERSET_ROOT_PATH"]);
  }

  readEnvironment(env: NodeJS.ProcessEnv = process.env): OrchestratorEnvironment {
    const port = env["SUPERSET_PORT"] ? Number(env["SUPERSET_PORT"]) : undefined;
    return {
      ...(env["SUPERSET_ROOT_PATH"] && { rootPath: env["SUPERSET_ROOT_PATH"] }),
      ...(env["SUPERSET_WORKSPACE_PATH"] && { workspacePath: env["SUPERSET_WORKSPACE_PATH"] }),
      ...(env["SUPERSET_WORKSPACE_NAME"] && { workspaceName: env["SUPERSET_WORKSPACE_NAME"] }),
      ...(Number.isFinite(port) && { port: port as number }),
    };
  }
}
