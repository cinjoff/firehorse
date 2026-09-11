# Ask

Design the Firehorse codebase-health capability as a local Planning Workspace before implementation.

The user wants Firehorse to provide continuous codebase improvement with minimal manual effort. The capability should keep a fresh, durable view of the codebase's architecture health, conventions, code smells, technical debt, and recurring memory-observed issues. It should surface findings at useful moments, create local cleanup Issue Drafts, and ask before publishing GitHub issues.

The requested implementation is full-scope, not manual-only:

- add a canonical `assess-codebase-health` Workflow definition and provider projections
- add provider-specific session-start hooks for Pi and Claude
- use freshness checks so deep analysis does not run on every session start
- use `pi-lens` and the bundled Matt Pocock `improve-codebase-architecture` skill strongly in the Pi environment
- use Claude-native memory, code tools, skills, and agents strongly in the Claude environment
- persist the current health state in `docs/codebase/health.md`
- create local cleanup Issue Drafts in a normal Planning Workspace
- require confirmation before publishing GitHub issues

This Planning Workspace captures the design decisions and PRD for implementation.
