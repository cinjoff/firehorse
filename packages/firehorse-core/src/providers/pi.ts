import { BaseProvider } from "./provider.js";
import type { ProviderCapabilities } from "../types.js";

/**
 * Pi.dev provider adapter — scaffold. Capabilities and detection to be
 * confirmed once the wire protocol is wired up.
 */
export class PiProvider extends BaseProvider {
  readonly id = "pi" as const;
  readonly displayName = "Pi.dev";
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolUse: true,
    vision: false,
    parallelToolCalls: false,
  };

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env["PI_API_KEY"]);
  }
}
