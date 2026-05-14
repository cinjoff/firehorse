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

## What ships in v0.1.0

- **`firehorse`** — TypeScript core library for provider/orchestrator contracts
  and pinned upstream provenance.
- **`firehorse-pi`** — Pi.dev package that bundles selected upstream Pi packages
  and Firehorse skills. This is the recommended user install.
- **`firehorse-claude`** — Claude Code plugin with mirrored skills and agents.

Firehorse v0.1.0 is intentionally a foundation release. It does **not** include
a Firehorse-authored skill runtime, prompt loader, slash-command runtime, or
provider API transport yet.

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
│  │ prompts + themes      │  mattpocock/skills, impeccable                │
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
<summary><strong>context-mode 1.0.133</strong> — keep huge outputs out of the model context</summary>

**Official docs:** [mksglu/context-mode](https://github.com/mksglu/context-mode)

The upstream docs describe context-mode as “the other half of the context
problem”: instead of dumping logs, test output, API responses, or large files
into the chat, it runs processing in a sandbox, stores searchable context, and
returns only targeted results.

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
<summary><strong>pi-subagents 0.24.2</strong> — delegate work to focused child agents</summary>

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
- **Subagent defaults:** code-oriented `pi-subagents` roles get `pi-lens` tools
  by default while respecting user-authored overrides.
- **Safe Superset setup:** `firehorse-setup` configures Superset MCP in user-
  global config and keeps API keys out of project repos.
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
pnpm upstreams:write-update-manifests
```

For future releases, use the repo-local release skill:

```text
/skill:firehorse-release
```

## Further reading

- [Architecture](./docs/ARCHITECTURE.md)
- [Upstream skills and agents](./docs/UPSTREAM-SKILLS.md)
- [Pi distribution README](./packages/firehorse-pi/README.md)
- [Claude plugin README](./packages/firehorse-claude/README.md)
- [v0.1.0 changelog](./CHANGELOG.md)

## License

Firehorse is MIT licensed. Bundled and mirrored upstreams keep their own
licenses and provenance; see package-level `THIRD_PARTY_NOTICES.md` files and
upstream `UPSTREAM.json` manifests.
