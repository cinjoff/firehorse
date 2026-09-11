# firehorse-graph

A local app for exploring a self-hosted supermemory store as an interactive graph.
Private to the monorepo — it is launched from a Firehorse command, not published to npm.

Status: scaffolding. The page is a placeholder; the graph, the exploration shell, and
the supermemory proxy arrive with [the map](https://github.com/cinjoff/firehorse/issues/86).

## Commands

| Command          | What it does                          |
| ---------------- | ------------------------------------- |
| `pnpm dev`       | Vite dev server with HMR              |
| `pnpm build`     | Production bundle into `dist/`        |
| `pnpm preview`   | Serve the built bundle                |
| `pnpm typecheck` | `tsc --noEmit`                        |
| `pnpm test`      | Vitest in jsdom, with Testing Library |

## Why this package differs from the others

`firehorse-core` is a library: tsup builds it to ESM and CJS with type declarations.
This is a browser app, so **Vite owns the build** and there is no `tsup.config.ts` and
no `exports` map — nothing imports from it.

Its `tsconfig.json` still extends `tsconfig.base.json`, but overrides four things the
base sets for Node libraries:

- `module`/`moduleResolution` → `ESNext`/`Bundler`, because Vite resolves, not Node.
- `lib` gains `DOM` and `DOM.Iterable`.
- `jsx: react-jsx`.
- `noEmit`, with `declaration` off — Vite emits, `tsc` only checks.
