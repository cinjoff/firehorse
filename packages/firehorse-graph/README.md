# firehorse-graph

A local app for exploring a self-hosted supermemory store as an interactive graph.
Private to the monorepo — it is launched by `/firehorse:memory`, not published to npm.

Read [`PRODUCT.md`](./PRODUCT.md) for what it is for and [`DESIGN.md`](./DESIGN.md)
for the visual world.

## Running it

```
pnpm --filter firehorse-graph build   # once, and after changing the app
pnpm --filter firehorse-graph serve   # http://localhost:5187
```

Running `serve` twice reuses the instance already listening rather than failing.
For app development, run `pnpm dev` beside `pnpm dev:server` — Vite proxies `/api`
to the server, so there is one API code path rather than two.

| Variable               | Default                 | Purpose                                                  |
| ---------------------- | ----------------------- | -------------------------------------------------------- |
| `SUPERMEMORY_API_URL`  | `http://localhost:6767` | The store to read                                        |
| `SUPERMEMORY_API_KEY`  | —                       | Optional; the local server accepts unauthenticated reads |
| `FIREHORSE_GRAPH_PORT` | `5187`                  | Where this app listens                                   |

The key also resolves from `SUPERMEMORY_CC_API_KEY` and
`~/.supermemory-claude/credentials.json`, in that order.

## Shape

- `server/` — the proxy. Holds the API config so no key reaches the browser, and
  exists because the supermemory server sends no CORS headers, which makes a
  same-origin proxy required rather than merely prudent.
- `src/api/adapt.ts` — the server's document shape is not assignable to the
  graph's `documents` prop. This is the seam.
- `src/shared/` — types and the two derivations shared by both sides: parsing a
  project name out of a container tag, and labelling a captured transcript.
- `src/components/` — the shell. `@supermemory/memory-graph` owns the canvas and
  nothing else; every other piece of chrome is here.

## Two things about the data

Both were found by running the app, not by reading the docs, and both are locked
by tests.

A memory entry's text is in `memory`. The published docs describe `content`,
`summary` and `title`; the self-hosted server sends none of them.

Documents captured from a coding session carry the raw transcript as their title
(`<|turn_start|>2026-09-11T14:49:46.657Z…`), so they are labelled by when the
session ran instead.

## Why this package differs from the others

`firehorse-core` is a library: tsup builds it to ESM and CJS with type
declarations. This is a browser app, so **Vite owns the build** and there is no
`tsup.config.ts` and no `exports` map — nothing imports from it.

Its `tsconfig.json` still extends `tsconfig.base.json`, but overrides four things
the base sets for Node libraries:

- `module`/`moduleResolution` → `ESNext`/`Bundler`, because Vite resolves, not Node.
- `lib` gains `DOM` and `DOM.Iterable`.
- `jsx: react-jsx`.
- `noEmit`, with `declaration` off — Vite emits, `tsc` only checks.
