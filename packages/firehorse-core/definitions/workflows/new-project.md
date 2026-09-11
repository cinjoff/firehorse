---
schemaVersion: 1
id: new-project
kind: workflow
title: New Project
description: Stand up a repo for Firehorse — remote, tracker, label vocabulary, upstream setup, the Firehorse manifest, a DESIGN.md interview — then hand off to the index workflow.
argumentHint: "[project name | repo path | remote URL]"
requires:
  tools:
    - read
    - bash
    - write
  environment:
    - filesystem
    - git
    - github
optional:
  tools:
    - grep
    - ls
    - edit
  environment:
    - node
    - pnpm
upstreamSkills:
  - upstream: mattpocock-skills
    id: setup-matt-pocock-skills
  - upstream: mattpocock-skills
    id: grilling
  - upstream: mattpocock-skills
    id: domain-modeling
---

# New Project

## Purpose

Use this workflow once per repo, before any other Firehorse workflow runs. `setup-matt-pocock-skills` writes the tracker, label, and domain-doc configuration the engineering skills assume. This workflow adds what Firehorse needs on top: the label vocabulary actually created in the tracker, `.firehorse/manifest.json` at schema version 2, an interviewed `DESIGN.md`, and a first index.

`DESIGN.md` is the reason the interview exists. It is the one anchor `/index` must not write (D-146): inferring direction from the components that already exist describes what the UI is, not what it should be. A human states it, or it stays absent.

## Usage

Invoke the generated command with the project name, a repo path, or a remote URL. `$ARGUMENTS` carries it. In an existing repo, invoke it with no arguments to fill in what is missing.

## Inputs

- `$ARGUMENTS`: project name, repo path, or remote URL.
- `git remote -v`, to decide whether a remote already exists and which it is.
- Whatever already exists: `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `docs/adr/`, `docs/agents/`, `.firehorse/`.
- The installed `mattpocock-skills` plugin version, read from `~/.claude/plugins/`.
- The human, for the `DESIGN.md` interview.

## Outputs

- A git repo with a GitHub remote.
- `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and `docs/agents/domain.md`, written by `setup-matt-pocock-skills`.
- The label vocabulary created in the tracker: the five triage labels, `wayfinder:map`, and `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, `wayfinder:task`.
- `.firehorse/manifest.json` with `schemaVersion: 2` and `setup.mattPocockSkills`.
- `DESIGN.md`, written from the interview, or recorded as absent.
- The `/index` output for the first commit.

## Supporting Capabilities

- Upstream skills: `mattpocock-skills` / `setup-matt-pocock-skills` for the per-repo configuration, `grilling` and `domain-modeling` for the `DESIGN.md` interview.
- Required: write access to the working tree, git, and `gh`.
- Optional: `pnpm`, for the gate clause the manifest's consumers read out of `package.json`.

## Orchestration Intent

You run `setup-matt-pocock-skills` first and take its output as given — tracker and label conventions live in `docs/agents/` under D-145, and nothing here duplicates them into the manifest. Then you create the labels, write the manifest, interview for `DESIGN.md`, and call `/index` last, so the index records a commit that already contains the anchors and the manifest.

## Safety Gates

- Do not write a field into `.firehorse/manifest.json` that is derivable at read time. Project name and GitHub owner and repo come from `git remote`; a second copy is a thing that can disagree.
- Do not write `DESIGN.md` from the existing code. It comes from the interview or it does not exist (D-146).
- Do not duplicate tracker or label conventions into the manifest. They live in `docs/agents/` (D-145).
- Do not put a secret or an id in the manifest. It is committed.
- Do not overwrite an existing `CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, or `docs/agents/` file without showing the human the diff first.
- Do not write a local planning draft under `docs/prds/` or `docs/issues/` (D-149).

## Procedure

1. Establish the repo. Initialise it when the path has no `.git`, and confirm the GitHub remote with `git remote -v`. No remote, and the tracker cannot work — create it with `gh repo create` or stop and ask.
2. Run `setup-matt-pocock-skills`. Let it explore, present, and confirm with the human as it specifies, then let it write `docs/agents/` and the `## Agent skills` pointer block.
3. Create the labels in the tracker with `gh label create`, from the table in `docs/agents/triage-labels.md`, plus `wayfinder:map` and the four `wayfinder:<type>` labels. A label that already exists is left alone.
4. Write `.firehorse/manifest.json`:

   ```json
   {
     "schemaVersion": 2,
     "setup": {
       "mattPocockSkills": { "version": "<installed version>", "at": "<ISO timestamp>" }
     }
   }
   ```

   `version` is the installed `mattpocock-skills` plugin version read from `~/.claude/plugins/`. Every field except `schemaVersion` is optional; `/index` fills in `index` and `anchors`.

5. Interview for `DESIGN.md`. Run `grilling` and `domain-modeling` on one question: what should this product look and behave like, stated as direction rather than as a description of what exists. Write the result to `DESIGN.md`. The human declines, or the project has no UI surface — leave the file absent and say so in one line.
6. Call `/index`. It runs the graph and supermemory passes, writes the derivable anchors under `docs/codebase/`, and records `index.commit`, `index.at`, `anchors.codebase`, and `anchors.design` into the manifest you just wrote.
7. Commit the setup output, the manifest, `DESIGN.md`, and the anchors in small, reviewable commits.
8. Report what now exists and what you left absent: the remote, the `docs/agents/` files, the labels you created versus the ones already there, the manifest fields, whether `DESIGN.md` exists, and the `/index` result.

## Projection Notes

The Claude mirror is a static command generated from this definition. The manifest shape above is documented here rather than produced by a script in this repo; `packages/firehorse-core/src/setup/` owns the schema that validates it, and `packages/firehorse-claude/hooks/check-setup.mjs` reads it without importing from the workspace. Run `pnpm definitions:write` after editing; the mirror is never hand-edited.
