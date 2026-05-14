import { BaseProvider } from "./provider.js";
import type { ProviderCapabilities } from "../types.js";

/**
 * OpenAI Codex CLI adapter. Detection via OPENAI_API_KEY or presence of the
 * `codex` binary. Actual execution wiring TBD.
 */
export class CodexProvider extends BaseProvider {
  readonly id = "codex" as const;
  readonly displayName = "OpenAI Codex";
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolUse: true,
    vision: true,
    parallelToolCalls: true,
  };

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env["OPENAI_API_KEY"]);
  }
}
