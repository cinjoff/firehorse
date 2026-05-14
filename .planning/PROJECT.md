# PROJECT.md

## Vision

**Firehorse** is a lightweight, cross-provider agentic skills framework — a
leaner, multi-provider successor to [`cinjoff/fhhs-skills`](https://github.com/cinjoff/fhhs-skills).
The same skill / agent surface should work across LLM providers (Claude,
Codex, Pi.dev, …) and orchestrators (Superset, Conductor, tmux, plain
terminal), with provider and orchestrator treated as first-class swappable
concerns rather than hardcoded assumptions.

## Who it's for

- The author (Konstantin / cinjoff) working primarily in Pydantic AI + Codex,
  with frequent context-switching across orchestrators.
- Developers using `cinjoff/fhhs-skills` who want a lighter alternative and
  who run agents on something other than Claude.
- Teams wanting to ship the same agent across multiple ecosystems without
  forking the skill source.

## Why it needs to exist

`fhhs-skills` was built Claude-first and grew heavy with Next.js / Vercel /
Supabase setup steps embedded into the framework's bootstrap. Firehorse keeps
the same spirit (codify agent skills, treat orchestration as part of the
contract) but:

1. **Cross-provider by default.** No assumption that "agent" means Anthropic.
2. **Lightweight.** No bundled web stack, no opinionated cloud setup. The
   core is a TS library that other things install.
3. **Orchestrator-aware.** Detects Superset / Conductor / tmux / terminal
   from env and exposes the differences as a single capability surface.

## Scope — what's in v0 (this branch)

- Monorepo skeleton: `firehorse-core` (TS lib) + `firehorse-pi` (Pi package)
  - `firehorse-claude` (Claude plugin).
- Adapter contracts for providers (Claude, Codex, Pi) and orchestrators
  (Superset, Conductor, tmux, terminal).
- Static, pinned upstream distribution: `mattpocock/skills` and the built-in
  `pi-subagents` agent set tracked in core and mirrored into adapter packages
  where needed.
- Pi upstream package re-exports for `context-mode`, `pi-lens`,
  `pi-mcp-adapter`, and `pi-subagents`.
- Cross-provider agent docs (`AGENTS.md`, `CLAUDE.md` defers to it).
- Build + typecheck verified on the core lib.

## Out of scope for v0

- Skill / agent execution runtime. Format, loader, prompt assembly — none of
  it is built; vendored skills and shared agent definitions are static
  distribution content only.
- Provider transports. No HTTP clients, no SSE parsing, no SDK wiring.
- Migrating `.pi/gsd/` (the existing fhhs-derived agents/workflows reference
  set) into firehorse proper. Treated as read-only reference for now.
- `fh:new-project` equivalents for either distribution.
- CLI, docs site, or any release plumbing.

## Constraints

- **Language / runtime:** TypeScript, ESM-first, Node ≥ 20. No Python in the
  framework itself (even though the author uses Pydantic AI downstream).
- **Package manager:** pnpm, monorepo via `pnpm-workspace.yaml`.
- **Build:** `tsup` per package (dual ESM/CJS + `.d.ts`).
- **Tests:** vitest (per-package, none written yet).
- **No default exports.** Named exports only. Adapter classes extend a
  matching `Base*` interface.
- **Adapter discipline.** Provider-specific or distribution-specific code
  must live in that adapter / package, never in the core lib. Core may hold
  provider-neutral, pinned upstream skill / agent source files for adapters to
  mirror.
- **Detection is side-effect-free.** Orchestrator detection reads env only;
  no shell-outs, file writes, or network calls.

## Tech stack

| Concern       | Choice                                                |
| ------------- | ----------------------------------------------------- |
| Language      | TypeScript 5 (strict, NodeNext modules)               |
| Runtime       | Node ≥ 20                                             |
| Workspace     | pnpm 9 monorepo (`packages/*`)                        |
| Bundler       | tsup (per package)                                    |
| Tests         | vitest                                                |
| Lint / format | Prettier (eslint optional, not yet configured)        |
| CI            | None yet                                              |
| GitHub        | `cinjoff/firehorse` (private, default remote)         |
| Orchestrators | Superset (current dev env), Conductor, tmux, terminal |
| Providers     | Claude (Anthropic), Codex (OpenAI), Pi.dev            |

## Distribution model

Three packages, each owns its ecosystem's idioms:

| Package            | Publish target      | Consumer                                                  |
| ------------------ | ------------------- | --------------------------------------------------------- |
| `firehorse-core`   | npm: `firehorse`    | TS/Node code, framework internals                         |
| `firehorse-pi`     | npm: `firehorse-pi` | Pi.dev users (`pi install npm:firehorse-pi`)              |
| `firehorse-claude` | Claude marketplace  | Claude Code (`/plugin marketplace add cinjoff/firehorse`) |

The Pi and Claude packages are **siblings**, not derived from one another.
Each adapts firehorse to its provider's idioms. The repo-level
`.claude-plugin/marketplace.json` exposes the Claude plugin so users can add
the marketplace once and install.

## Success criteria

- Users install **one** package per ecosystem (`firehorse-pi` for Pi,
  `firehorse` plugin for Claude) and get the full firehorse surface.
- The same skill definitions, once defined, work across Claude and Codex
  without provider-specific forks.
- Adding a fifth provider or third orchestrator is one file + a registry
  entry.
- Repo install (`pnpm install`) and typecheck/build (`pnpm typecheck && pnpm
build`) succeed clean on Node 20+.

## References

- Pi packages: https://pi.dev/docs/latest/packages
- Prior art reference: `.pi/gsd/` in this repo — fhhs-skills GSD agent
  library, kept read-only.
- Original framework: https://github.com/cinjoff/fhhs-skills
