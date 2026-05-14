import type { ProviderCapabilities, ProviderId } from "../types.js";

/**
 * Provider adapter contract. Each provider (Claude, Codex, Pi, ...) implements
 * this interface so skills/agents can stay provider-agnostic.
 *
 * Methods are intentionally minimal — they will grow as the framework defines
 * its skill execution model.
 */
export interface Provider {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;

  /**
   * Returns true when this provider can be used in the current environment
   * (env vars present, CLI installed, etc.). Detection only — does not connect.
   */
  isAvailable(): Promise<boolean>;
}

export abstract class BaseProvider implements Provider {
  abstract readonly id: ProviderId;
  abstract readonly displayName: string;
  abstract readonly capabilities: ProviderCapabilities;

  abstract isAvailable(): Promise<boolean>;
}
