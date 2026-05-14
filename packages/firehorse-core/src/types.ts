/**
 * Core firehorse types. Scaffolding only — no behavior yet.
 */

export type ProviderId = "claude" | "codex" | "pi" | (string & {});

export type OrchestratorId =
  | "superset"
  | "conductor"
  | "tmux"
  | "terminal"
  | (string & {});

export interface ProviderCapabilities {
  streaming: boolean;
  toolUse: boolean;
  vision: boolean;
  parallelToolCalls: boolean;
}

export interface OrchestratorCapabilities {
  worktrees: boolean;
  parallelAgents: boolean;
  portAssignment: boolean;
  sharedFilesystem: boolean;
}

export interface FirehorseContext {
  provider: ProviderId | null;
  orchestrator: OrchestratorId | null;
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
}

export interface FirehorseError extends Error {
  code: string;
  cause?: unknown;
}
