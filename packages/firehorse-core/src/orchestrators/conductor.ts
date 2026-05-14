import { BaseOrchestrator, type OrchestratorEnvironment } from "./orchestrator.js";
import type { OrchestratorCapabilities } from "../types.js";

/**
 * Conductor (conductor.build) — worktree-based orchestrator. Detection keys
 * off `CONDUCTOR_WORKSPACE_NAME` / `CONDUCTOR_ROOT_PATH`.
 */
export class ConductorOrchestrator extends BaseOrchestrator {
  readonly id = "conductor" as const;
  readonly displayName = "Conductor";
  readonly capabilities: OrchestratorCapabilities = {
    worktrees: true,
    parallelAgents: true,
    portAssignment: true,
    sharedFilesystem: true,
  };

  detect(env: NodeJS.ProcessEnv = process.env): boolean {
    return Boolean(env["CONDUCTOR_WORKSPACE_NAME"] ?? env["CONDUCTOR_ROOT_PATH"]);
  }

  readEnvironment(env: NodeJS.ProcessEnv = process.env): OrchestratorEnvironment {
    const port = env["CONDUCTOR_PORT"] ? Number(env["CONDUCTOR_PORT"]) : undefined;
    return {
      ...(env["CONDUCTOR_ROOT_PATH"] && { rootPath: env["CONDUCTOR_ROOT_PATH"] }),
      ...(env["CONDUCTOR_WORKSPACE_PATH"] && { workspacePath: env["CONDUCTOR_WORKSPACE_PATH"] }),
      ...(env["CONDUCTOR_WORKSPACE_NAME"] && { workspaceName: env["CONDUCTOR_WORKSPACE_NAME"] }),
      ...(Number.isFinite(port) && { port: port as number }),
    };
  }
}
