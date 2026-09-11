export type { Provider } from "./provider.js";
export { BaseProvider } from "./provider.js";
export { ClaudeProvider } from "./claude.js";
export { CodexProvider } from "./codex.js";

import type { Provider } from "./provider.js";
import type { ProviderId } from "../types.js";
import { ClaudeProvider } from "./claude.js";
import { CodexProvider } from "./codex.js";

/**
 * Built-in provider registry. External providers can be added by passing
 * additional Provider instances to the framework entrypoint (TBD).
 */
export const builtinProviders: Provider[] = [
  new ClaudeProvider(),
  new CodexProvider(),
];

export function findProvider(id: ProviderId): Provider | undefined {
  return builtinProviders.find((p) => p.id === id);
}
