# firehorse

Firehorse is a **one-install agent skills distribution** plus a small
cross-provider foundation library.

In plain language: it collects the agent skills, subagents, web tools, code
navigation tools, and setup glue that I want available in every serious coding
agent session, then packages them so they work in both **Pi.dev** and
**Claude Code**.

It exists because useful agent workflows are currently fragmented: some skills
live in Claude plugin format, some tools are Pi extensions, some capabilities
come from MCP, and some projects need orchestration context from Superset or
other shells. Users should not have to install, wire, and audit each piece
manually.

Firehorse gives that surface a reviewed, versioned home.

## Recommended way to use it

Firehorse is designed to support **Pi.dev and Claude Code equally well**. The
recommended daily driver is:

```text
Pi.dev + Codex model + firehorse-pi
```

Why this is the recommended path:

- Pi packages can bundle extensions, skills, prompts, themes, and direct tools
  in one install.
- Codex is a strong default coding model for the Pi workflow.
- Pi gives Firehorse the richest runtime surface today: subagents, MCP adapter,
  web access, LSP/code intelligence, context-saving tools, and TUI diagram
  rendering.

Claude Code remains first-class: the same selected upstream skills and shared
subagent roles are mirrored into a Claude plugin. Claude just cannot consume Pi
extensions directly, so the Pi distribution is the more complete driver today.

## Install

### Pi.dev

```sh
pi install npm:firehorse-pi
```

Or install this repository directly:

```sh
pi install git:github.com/cinjoff/firehorse
```

Then run:

```text
/skill:firehorse-setup
```

### Claude Code

```text
/plugin marketplace add cinjoff/firehorse
/plugin install firehorse@firehorse
```

### TypeScript core library

```sh
pnpm add firehorse
```

The core library is for adapter contracts and future integrations. It is not a
skill runtime yet.

## What ships in v0.2.0

- **`firehorse`** — TypeScript core library for provider/orchestrator contracts
  and pinned upstream provenance.
- **`firehorse-pi`** — Pi.dev package that bundles selected upstream Pi packages
  and Firehorse skills. This is the recommended user install.
- **`firehorse-claude`** — Claude Code plugin with mirrored skills and agents.

Firehorse v0.2.0 remains a foundation release. It includes the
Firehorse Definition Format v1 parser, validator, and build-time projection
pipeline, but it does **not** include a Firehorse-authored skill runtime, prompt
loader, slash-command runtime, or provider API transport yet.

## Definition authoring

Canonical Firehorse-authored definitions live in
`packages/firehorse-core/definitions/{workflows,skills,agents}/` and are
Markdown files with schema-versioned frontmatter. The durable architecture
summary is in `docs/ARCHITECTURE.md`; the detailed PRD-0001 v1 contract appendix
lives at
`docs/prds/prd-0001-firehorse-definition-format-and-projection/FIREHORSE-DEFINITION-FORMAT.md`
with complete examples for `fix-bug`, `feedback-loop`, and `reviewer`.

```sh
pnpm definitions:write  # regenerate checked-in Pi/Claude mirrors + manifests
pnpm definitions:check  # non-mutating freshness and safety check
```

Generated mirrors include Firehorse provenance and SHA-256 source hashes. Edit
the canonical definition files, not the generated provider mirrors.

## How it is wired

```text
                                 ┌───────────────────────┐
                                 │   upstream sources    │
                                 │ skills, agents, tools │
                                 └───────────┬───────────┘
                                             │ reviewed + pinned
                                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              firehorse                                  │
│                                                                         │
│  ┌───────────────────────┐       mirrors / manifests       ┌─────────┐ │
│  │ firehorse-core        │────────────────────────────────▶│ Claude  │ │
│  │                       │                                  │ plugin  │ │
│  │ provider contracts:   │                                  └─────────┘ │
│  │  Claude / Codex / Pi  │                                      ▲       │
│  │                       │                                      │       │
│  │ orchestrators:        │                                  install     │
│  │  Superset / tmux /    │                                      │       │
│  │  Conductor / terminal │                                      │       │
│  └───────────┬───────────┘                                      │       │
│              │                                                   │       │
│              │ curated Pi allow-list                             │       │
│              ▼                                                   │       │
│  ┌───────────────────────┐       recommended driver              │       │
│  │ firehorse-pi          │───────────────────────────────────────┘       │
│  │                       │                                               │
│  │ Pi extensions         │  context-mode, pi-lens, pi-mcp-adapter,       │
│  │ Pi skills             │  pi-mermaid, pi-subagents, pi-web-access,     │
│  │ prompts + themes      │  pi-agent-memory + claude-mem worker,         │
│  │                       │  mattpocock/skills, impeccable, shadcn/ui    │
│  └───────────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

The important design choice: **bundling is not the same as exposing**.
`firehorse-pi` may bundle an upstream package for runtime support, but the Pi
manifest explicitly allow-lists what users see.

## Upstream packages and skills

Each section below summarizes the upstream's own documentation, explains why it
is included in Firehorse, and lists the specific skills/resources Firehorse
exposes.

<details>
<summary><strong>context-mode 1.0.135</strong> — keep huge outputs out of the model context</summary>

**Official docs:** [mksglu/context-mode](https://github.com/mksglu/context-mode)

The upstream docs describe context-mode as “the other half of the context
problem”: instead of dumping logs, test output, API responses, or large files
into the chat, it runs processing in a sandbox, stores searchable context, and
returns only targeted results.

**How it works:** the agent routes commands and reads that might produce large
output through context-mode tools instead of pasting raw data into the
conversation. `ctx_execute` and `ctx_execute_file` run code or process files in
an isolated subprocess; only the script's stdout, usually a summary or exact
finding, enters model context. `ctx_batch_execute`, `ctx_index`,
`ctx_fetch_and_index`, and `ctx_search` keep bulky command output, docs, and web
pages in a local searchable SQLite/FTS index, then retrieve only the snippets
matching the current query. This preserves context for decisions and code while
still making large artifacts searchable on demand.

**Role in Firehorse:** protect the context window during coding sessions and
make large-output work reliable.

**Firehorse exposes:**

- Pi extension — adds context-mode tools to Pi.
- `context-mode` skill — tells the agent to use `ctx_batch_execute`,
  `ctx_execute`, `ctx_execute_file`, indexing, and search for large outputs.
- `ctx-doctor` skill — diagnoses context-mode installation/runtime issues.
- `ctx-insight` skill — opens the context-mode analytics dashboard.
- `ctx-stats` skill — shows context savings for the current session.

Firehorse intentionally does **not** expose destructive/upgrade-oriented
context-mode skills by default.

</details>

<details>
<summary><strong>pi-lens 3.8.44</strong> — code intelligence for Pi agents</summary>

**Official docs:** [apmantza/pi-lens](https://github.com/apmantza/pi-lens)

The upstream docs describe pi-lens as real-time code feedback for Pi, with hooks
around write/edit, session start, turn end, and agent completion. Its feature set
centers on LSP support, formatters, diagnostics, review graphs, and read-before-
edit safeguards.

**Role in Firehorse:** give the agent IDE-like code awareness instead of relying
on plain text search.

**Firehorse exposes:**

- Pi extension — enables pi-lens feedback and direct code-intelligence tools.
- `ast-grep` skill — prefers structural AST search/rewrite over text grep for
  code patterns.
- `lsp-navigation` skill — uses definitions, references, hover, diagnostics,
  signatures, implementations, and call hierarchy.
- Direct tools — `ast_grep_search`, `ast_grep_replace`, `lsp_diagnostics`, and
  `lsp_navigation`.

Firehorse also grants these direct tools to code-oriented `pi-subagents` roles by
default.

</details>

<details>
<summary><strong>pi-mcp-adapter 2.6.1</strong> — MCP access without context bloat</summary>

**Official docs:** [nicobailon/pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter)

The upstream docs frame the package around a specific MCP problem: tool
definitions are verbose, and loading several MCP servers can burn a large part
of the context window before the conversation starts. The adapter exposes a
small proxy and discovers/starts servers on demand.

**Role in Firehorse:** make MCP servers practical inside Pi sessions.

**Firehorse exposes:**

- Pi extension — adds MCP proxy support to Pi.
- Superset MCP setup — `firehorse-setup` configures Superset's hosted MCP
  endpoint through this adapter when Superset is detected or requested.
- Lazy server lifecycle — MCP servers can stay unloaded until the agent actually
  needs them.

There is no separate Firehorse skill for this package; it is infrastructure used
by setup and by Pi's tool layer.

</details>

<details>
<summary><strong>pi-mermaid 0.3.0</strong> — render diagrams in the Pi TUI</summary>

**Official docs:** [Gurpartap/pi-mermaid](https://github.com/Gurpartap/pi-mermaid)

The upstream docs describe pi-mermaid as a Pi extension that renders Mermaid
blocks as ASCII diagrams inside Pi's TUI. It validates syntax with Mermaid and
renders through `beautiful-mermaid`.

**Role in Firehorse:** make architectural diagrams readable directly in agent
sessions and README/planning workflows.

**Firehorse exposes:**

- Pi extension — renders Mermaid code blocks as ASCII in the Pi TUI.

There are no user-facing skills from this package; it is a display enhancement.

</details>

<details>
<summary><strong>pi-subagents 0.24.3</strong> — delegate work to focused child agents</summary>

**Official docs:** [nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents)

The upstream docs describe pi-subagents as a way for Pi to delegate work to
focused child agents for code review, scouting, implementation, parallel audits,
saved workflows, background jobs, and other tasks that benefit from additional
model perspectives.

**Role in Firehorse:** provide the orchestration layer for multi-agent coding
workflows.

**Firehorse exposes:**

- Pi extension — runtime support for subagents, chains, parallel fan-out,
  async/background runs, and TUI clarification.
- `pi-subagents` skill — instructions for single-agent, chain, parallel, async,
  forked-context, and intercom-coordinated delegation.
- Prompt templates — bundled from upstream because the extension uses them for
  workflows.
- Built-in agents — shared role vocabulary mirrored into Claude.

**Shared agent roles:**

- `context-builder` — builds compact context and meta-prompts.
- `delegate` — handles direct bounded delegated tasks.
- `oracle` — preserves decision consistency and prevents drift.
- `planner` — produces implementation plans.
- `researcher` — searches and synthesizes focused research briefs.
- `reviewer` — reviews code, plans, PRs, issues, and architecture.
- `scout` — quickly maps a codebase area for handoff.
- `worker` — implements approved tasks.

</details>

<details>
<summary><strong>pi-web-access 0.10.7</strong> — web search, content extraction, and video understanding</summary>

**Official docs:** [nicobailon/pi-web-access](https://github.com/nicobailon/pi-web-access)

The upstream docs describe Pi Web Access as web search, content extraction, and
video understanding for Pi, with zero-config Exa search and optional Exa,
Perplexity, Gemini API, or Gemini Web configuration.

**Role in Firehorse:** give agents a reviewed way to fetch current docs,
research libraries, inspect GitHub repos, read PDFs, and understand YouTube or
local video content.

**Firehorse exposes:**

- Pi extension — adds web/search/fetch/content tools to Pi.
- `librarian` skill — researches open-source libraries with evidence-backed
  answers and source links.
- Direct tools — web search, code search, URL/content extraction, stored-content
  retrieval, and video-aware fetching where configured.

</details>

<details>
<summary><strong>claude-mem 13.2.0 + pi-agent-memory 0.3.4</strong> — persistent cross-session memory</summary>

**Official docs:** [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) and [ArtemisAI/pi-mem](https://github.com/ArtemisAI/pi-mem)

Claude-Mem captures coding-session activity, compresses it into searchable
observations, and injects relevant context into future sessions through hooks,
an MCP search server, and a local worker. The Pi adapter connects Pi sessions to
the same claude-mem worker so memory can be shared across Claude Code, Pi,
OpenClaw, and other supported engines.

**Role in Firehorse:** make past session context searchable and reusable without
Firehorse forking the memory worker/runtime. `firehorse-setup` uses
`gh repo view --json name --jq .name` to resolve the canonical GitHub repository
name, then pins `FIREHORSE_PROJECT_NAME`, `CLAUDE_MEM_PROJECT`, and
`PI_MEM_PROJECT` so Superset / Conductor worktrees share the canonical repo
memory namespace instead of relying on git parent directories or cwd basenames.

**Runtime requirement:** `pi-agent-memory` is the Pi adapter and needs the
upstream `claude-mem` worker. Firehorse-pi bundles the `claude-mem` npm package
and starts/checks the bundled worker for Pi-only harness use, so Claude Code is
not required. `npx claude-mem install` or the Claude Code plugin marketplace are
fallback / repair paths. The upstream docs explicitly say `npm install -g
claude-mem` installs only the SDK / library and does not configure hooks or
start the worker.

**Firehorse exposes:**

- Claude dependency — the Firehorse marketplace includes a pinned `claude-mem`
  plugin entry sourced from the upstream `plugin/` subdirectory, and the
  Firehorse Claude plugin declares it as a dependency.
- Pi bundled worker — `firehorse-pi` bundles `claude-mem@13.2.0` and a small
  session-start extension starts/checks the worker on `127.0.0.1:37777` by
  default.
- Pi extension — `pi-agent-memory` registers Pi lifecycle hooks and a
  `memory_recall` tool against the running claude-mem worker.
- `mem-search` skill — tells Pi agents when and how to search persistent memory.
- Setup check — `firehorse-setup --check` should report whether the worker is
  reachable and show the upstream install/repair command when it is not.

</details>

<details>
<summary><strong>mattpocock/skills</strong> — small, composable engineering skills</summary>

**Official docs:** [mattpocock/skills](https://github.com/mattpocock/skills)

The upstream docs call these “Skills For Real Engineers”: small, adaptable,
composable skills for real application work rather than a process that takes
over the whole project.

**Role in Firehorse:** provide disciplined engineering workflows without adding a
Firehorse runtime.

Firehorse exposes the skills selected by the upstream Claude plugin manifest.
Deprecated, personal, in-progress, and misc skills are not exposed unless
Firehorse explicitly allow-lists them later.

**Firehorse exposes:**

- `diagnose` — reproduce, minimize, hypothesize, instrument, fix, and
  regression-test bugs/performance regressions.
- `grill-with-docs` — stress-test a plan against domain docs and ADRs.
- `triage` — triage issues through a role/state-machine workflow.
- `improve-codebase-architecture` — find deeper refactoring and architecture
  opportunities.
- `setup-matt-pocock-skills` — configure issue tracker, triage labels, and
  domain-doc layout for the skill set.
- `tdd` — work test-first using red/green/refactor.
- `to-issues` — break a plan/spec into independently grabbable issues.
- `to-prd` — turn conversation context into a PRD.
- `zoom-out` — ask for a higher-level map of unfamiliar code.
- `prototype` — build a throwaway terminal or UI prototype.
- `caveman` — use ultra-compressed communication.
- `grill-me` — interview the user until a plan/design is understood.
- `handoff` — compact the conversation for another agent.
- `write-a-skill` — create new Agent Skills with good structure and progressive
  disclosure.

</details>

<details>
<summary><strong>shadcn/ui</strong> — reliable component installation, composition, and presets</summary>

**Official docs:** [shadcn/ui skills](https://ui.shadcn.com/docs/skills) and [shadcn-ui/ui](https://github.com/shadcn-ui/ui)

The upstream skill teaches agents to inspect `components.json`, use the correct
package runner, search registries, fetch component docs before coding, install or
update components through the CLI, respect icon/base/Tailwind choices, and apply
presets without manually decoding preset codes.

**Role in Firehorse:** make shadcn/ui component work reliable in both Pi and
Claude, especially when adding new UI components or applying project-specific
design presets.

**Firehorse exposes:**

- `shadcn` — official shadcn/ui skill mirrored into both Pi and Claude. It is
  available for shadcn/ui tasks, but is not granted to the Pi `worker` subagent
  by default yet.

</details>

<details>
<summary><strong>pbakaus/impeccable</strong> — frontend design vocabulary and critique</summary>

**Official docs:** [pbakaus/impeccable](https://github.com/pbakaus/impeccable)

The upstream docs describe Impeccable as “the vocabulary you didn't know you
needed”: one skill, many design commands, curated anti-patterns, and references
for typography, color, motion, spatial design, interaction, responsive behavior,
and UX writing. It started from Anthropic's frontend-design skill and expands it
with stronger product/brand design guidance.

**Role in Firehorse:** give frontend work a stronger design-review and design-
implementation loop than generic “make it look better” prompting.

**Firehorse exposes:**

- `impeccable` — design, redesign, critique, audit, polish, clarify, harden,
  optimize, adapt, animate, colorize, document, and improve frontend interfaces.

</details>

## Firehorse-specific customization

Firehorse adds a small amount of glue around the upstreams:

- **Curated allow-list:** bundled packages do not automatically expose every
  upstream file.
- **Subagent defaults:** code-oriented `pi-subagents` roles get `pi-lens`, the
  Pi-native `memory_recall` tool from `pi-agent-memory`, and context-mode
  processing tools where useful while respecting user-authored overrides.
- **Safe Superset setup:** `firehorse-setup` configures Superset MCP in user-
  global config, pins memory project identity explicitly, and keeps API keys out
  of project repos.
- **Firehorse release checks:** Pi and Claude check Firehorse versions and point
  to Firehorse release notes instead of polling every upstream at startup.
- **Adapter-native mirrors:** selected skills are mirrored into Pi and Claude in
  each ecosystem's native format.

## Development

```sh
pnpm install
pnpm upstreams:check
pnpm typecheck
pnpm build
pnpm test
```

Update pinned upstream mirrors with:

```sh
pnpm upstreams:update:mattpocock-skills
pnpm upstreams:update:impeccable
pnpm upstreams:update:shadcn-ui
# claude-mem / pi-agent-memory pins are updated by editing their UPSTREAM.json
# manifests plus the package / marketplace pins, then checking upstreams.
pnpm upstreams:write-update-manifests
```

For future releases, use the repo-local release skill:

```text
/skill:firehorse-release
```

## Further reading

- [Architecture](./docs/ARCHITECTURE.md)
- [PRD-0001 workflow map context](./docs/prds/prd-0001-firehorse-definition-format-and-projection/context/WORKFLOW-MAP.md)
- [Upstream skills and agents](./docs/UPSTREAM-SKILLS.md)
- [Pi distribution README](./packages/firehorse-pi/README.md)
- [Claude plugin README](./packages/firehorse-claude/README.md)
- [Changelog](./CHANGELOG.md)

## License

Firehorse is MIT licensed. Bundled and mirrored upstreams keep their own
licenses and provenance; see package-level `THIRD_PARTY_NOTICES.md` files and
upstream `UPSTREAM.json` manifests.
