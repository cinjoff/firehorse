import type { OrchestratorCapabilities, OrchestratorId } from "../types.js";

export interface OrchestratorEnvironment {
  /** Root path shared across worktrees, if any. */
  rootPath?: string;
  /** Path of the current worktree/workspace. */
  workspacePath?: string;
  /** Human-readable workspace name. */
  workspaceName?: string;
  /** Port assigned to this workspace by the orchestrator, if any. */
  port?: number;
}

/**
 * Orchestrator adapter contract. An orchestrator is whatever owns the shell
 * Firehorse runs inside — Superset, Conductor, tmux, plain terminal, etc.
 *
 * Detection is intentionally synchronous so it can be called eagerly during
 * framework bootstrap without awaiting anything.
 */
export interface Orchestrator {
  readonly id: OrchestratorId;
  readonly displayName: string;
  readonly capabilities: OrchestratorCapabilities;

  /** True when this orchestrator owns the current shell. */
  detect(env?: NodeJS.ProcessEnv): boolean;

  /** Reads orchestrator-provided context from env. Empty object when none. */
  readEnvironment(env?: NodeJS.ProcessEnv): OrchestratorEnvironment;
}

export abstract class BaseOrchestrator implements Orchestrator {
  abstract readonly id: OrchestratorId;
  abstract readonly displayName: string;
  abstract readonly capabilities: OrchestratorCapabilities;
  abstract detect(env?: NodeJS.ProcessEnv): boolean;
  abstract readEnvironment(env?: NodeJS.ProcessEnv): OrchestratorEnvironment;
}
