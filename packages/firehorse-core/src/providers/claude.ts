import { BaseProvider } from "./provider.js";
import type { ProviderCapabilities } from "../types.js";

export class ClaudeProvider extends BaseProvider {
  readonly id = "claude" as const;
  readonly displayName = "Anthropic Claude";
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolUse: true,
    vision: true,
    parallelToolCalls: true,
  };

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env["ANTHROPIC_API_KEY"]);
  }
}
