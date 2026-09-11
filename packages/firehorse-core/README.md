# firehorse

Core library for firehorse.

This is the **library** — the canonical definitions, the Firehorse Definition
Format parser and validator, the projection generator, and the provider and
orchestrator adapter contracts that the Claude plugin and custom integrations
build on. It has no runtime opinion about how skills are loaded or executed.

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

## Canonical definitions

Firehorse-authored definitions live under `definitions/{workflows,skills}/`. The
projector in `src/definitions/` renders them into the Claude plugin's
`commands/` and `skills/` directories.

Use these workspace scripts from the repo root:

```sh
pnpm definitions:write
pnpm definitions:check
```

