---
name: firehorse-release
description: Prepare and publish Firehorse releases. Use when releasing this repo, cutting a GitHub tag/release, refreshing the README/release notes, checking upstream package/skill updates, or verifying GitHub Actions for Firehorse.
---

# Firehorse Release

Use this skill to release the Firehorse monorepo. It is repo-local maintainer
process, not part of the shipped `firehorse-pi` package.

Default scope: **GitHub release + git tag only**. Do not publish npm packages or
mutate package registries unless the user explicitly asks.

## Required workflow

1. **Load release context**
   - Read `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `docs/PROJECT.md`,
     `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/UPSTREAM-SKILLS.md`,
     root `README.md`, and package manifests.
   - If Definition Format examples/projection contracts changed, also read
     `docs/prds/prd-0001-firehorse-definition-format-and-projection/FIREHORSE-DEFINITION-FORMAT.md`.
   - If release notes need historical workflow-grouping context, also read
     `docs/prds/prd-0001-firehorse-definition-format-and-projection/context/WORKFLOW-MAP.md`.
   - Check `git status --short`, current branch, latest tags, `gh auth status`,
     and relevant GitHub issues/milestones/projects for release scope.

2. **Check upstream freshness first**
   - Run `pnpm upstreams:check` before editing release docs.
   - If it reports updates, summarize each pinned/current/latest version and
     suggest the matching upgrade command or dependency bump.
   - Stop for user confirmation unless the user has already said to release the
     current pinned upstreams anyway.

3. **Refresh release docs**
   - Ensure root `README.md` describes purpose, architecture, package layout,
     upstream packages/skills, exposed roles, overrides/customizations, install,
     setup, maintainer workflow, and an ASCII wiring diagram.
   - Update package READMEs, `docs/UPSTREAM-SKILLS.md`, and `CHANGELOG.md` when
     the release changes user-facing behavior or pinned upstreams.

4. **Bump versions and manifests**
   - Pick/confirm the semver version (`vX.Y.Z`).
   - Update every Firehorse version field and generated update manifest.
   - Keep bundled upstream versions in sync across `package.json`,
     `firehorse.update.json`, docs, and `pnpm-lock.yaml`.

5. **Quality gates**
   - Run upstream check again, then `pnpm typecheck`, `pnpm build`, and
     `pnpm test`.
   - If GitHub Actions workflows exist, verify they are present and watch the
     release commit/tag runs after pushing.

6. **Publish GitHub release**
   - Commit the release changes.
   - Create an annotated `vX.Y.Z` tag.
   - Push the branch and tag.
   - Create the GitHub release with concise notes that mention Firehorse changes
     and upstream package/skill changes.
   - Verify `gh release view vX.Y.Z` and GitHub Actions status.

7. **Report**
   - Return release URL, tag, commit SHA, commands run, quality-gate results,
     upstream status, and any follow-ups.

See [REFERENCE.md](REFERENCE.md) for exact checklists, file lists, commands, and
release-note template.
