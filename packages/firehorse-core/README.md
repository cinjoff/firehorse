# firehorse

Core library for the firehorse cross-provider agentic skills framework.

This is the **library** — provider and orchestrator adapters that other code
(the Pi package, the Claude plugin, custom integrations) builds on. It also
holds pinned upstream skill sources that the distribution packages mirror into
their native formats. It has no runtime opinion about how skills are loaded or
executed.

For the framework as a whole, see the [workspace README](../../README.md).

## Install

```sh
pnpm add firehorse
# or
npm i firehorse
```

## Use

```ts
import { detectOrchestrator, builtinProviders } from "firehorse";

const orchestrator = detectOrchestrator();
console.log(orchestrator.id); // "superset" | "conductor" | "tmux" | "terminal"

for (const p of builtinProviders) {
  if (await p.isAvailable()) console.log(`provider ready: ${p.id}`);
}
```

See `src/types.ts`, `src/providers/`, and `src/orchestrators/` for the TypeScript
surface.

## Upstream skill sources

Vendored upstream skills live under `upstreams/`. The current upstream is
`upstreams/mattpocock-skills/`, pinned by `UPSTREAM.json`. Distribution packages
mirror selected skills from that core copy into their own `skills/` directories.

Use these workspace scripts from the repo root:

```sh
pnpm upstreams:check
pnpm upstreams:update:mattpocock-skills
```
