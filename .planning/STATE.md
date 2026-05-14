# STATE.md

Current position in the roadmap. Updated as work progresses.

## Current

- **Branch:** `Konstantin-Indjov/initiate-foundations-for-agentic-skills-framework`
- **Worktree:** Superset (`SUPERSET_ROOT_PATH=/Users/konstantin/.superset/projects/firehorse`)
- **Active phase:** Phase 1+ — Foundation scaffolding plus scoped upstream
  distribution content (`active`, awaiting review/commit)
- **Next phase:** Phase 2 — Cross-provider skill format
- **Outstanding work in current branch:** review the newly vendored
  `mattpocock/skills` and `pbakaus/impeccable` mirrors, curated bundled Pi
  packages (now including `pi-mermaid`), upstream-tracking scripts, and
  session-start update checks before committing.

## What's on disk right now

```
firehorse/
├── packages/
│   ├── firehorse-core/      TS lib + pinned upstream skill / agent sources
│   ├── firehorse-pi/        Pi package + curated upstream Pi packages,
│   │                         mattpocock + impeccable skills, shared agents,
│   │                         subagent defaults, and update check
│   └── firehorse-claude/    Claude plugin + curated mattpocock + impeccable
│                             skills, shared agents, and update hook
├── .claude-plugin/
│   └── marketplace.json     Repo-level Claude marketplace
├── .planning/               This planning surface
├── docs/ARCHITECTURE.md / docs/UPSTREAM-SKILLS.md
├── AGENTS.md / CLAUDE.md / README.md
└── tooling: pnpm-workspace, tsconfig.base, .npmrc, etc.
```

`.pi/gsd/` (pre-existing fhhs-skills reference material) is untouched.
`.firecrawl/` is gitignored cache from doc fetches.

## Commit state

Nothing committed. Last commit on this branch is `5a3a02e` (initial: LICENSE

- README placeholder). Everything from this session is unstaged.

## Open decisions to make before Phase 2 starts

See `ROADMAP.md` → Phase 2 "Open questions". The big one is: single canonical
skill format vs two-with-shared-schema. Decision goes in `DECISIONS.md` once
made.

## Resuming a session

1. Read this file (`STATE.md`) to see where we are.
2. Read `.planning/ROADMAP.md` to see what phase we're working.
3. Read `.planning/REQUIREMENTS.md` for the granular work-item list.
4. Read `.planning/DECISIONS.md` to avoid relitigating settled questions.
5. `AGENTS.md` and `docs/ARCHITECTURE.md` cover the framework shape.
