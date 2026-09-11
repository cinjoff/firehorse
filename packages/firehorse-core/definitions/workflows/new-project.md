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

Use this workflow once per repo, before any other Firehorse workflow runs. `setup-matt-pocock-skills` writes the tracker, label, and domain-doc configuration the engineering skills assume. This workflow adds what Firehorse needs on top: the label vocabulary actually created in the tracker, `.firehorse/manifest.json` at schema version 2, an **interviewed** `DESIGN.md`, and a first index.

`DESIGN.md` is the reason the interview exists. It is the one anchor `/firehorse:index` must not write: inferring direction from the components that already exist describes what the UI is, not what it should be. A human states it, or it stays absent.

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
- `.firehorse/manifest.json` with `schemaVersion: 2`, `setup.mattPocockSkills`, and the `anchors` record every later workflow reads instead of re-probing this repo.
- `DESIGN.md`, written from the interview, or recorded as absent.
- The `/firehorse:index` output for the first commit.

## Supporting Capabilities

- `mattpocock-skills` / `setup-matt-pocock-skills` supplies the per-repo configuration; `grilling` and `domain-modeling` run the `DESIGN.md` interview.
- `pnpm` is optional, and decides the gate clause the manifest's consumers read out of `package.json`.

## Orchestration Intent

You follow `setup-matt-pocock-skills` first and take its output as given — tracker and label conventions live in `docs/agents/`, and nothing here duplicates them into the manifest. Then you create the labels, write the manifest, interview for `DESIGN.md`, and call `/firehorse:index` last, so the index records a commit that already contains the anchors and the manifest.

## Safety Gates

- **The manifest records what a later workflow would otherwise re-derive every run** — which anchors exist — and nothing a single command already answers. Project name, GitHub owner and repo come from `git remote`; a second copy is a thing that can disagree.
- **`DESIGN.md` comes from the interview** or it does not exist.
- **Tracker and label conventions live in `docs/agents/`**, not in the manifest.
- **The manifest is committed**, so it carries no secret and no id.
- **An existing `CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, or `docs/agents/` file changes only after the human sees the diff.**
- **Planning lives in the tracker** the tracker doc records, never a markdown draft committed beside the code.

## Manifest shape

```json
{
  "schemaVersion": 2,
  "setup": {
    "mattPocockSkills": { "version": "<installed version>", "at": "<ISO timestamp>" }
  },
  "anchors": {
    "context": true,
    "agents": true,
    "design": false,
    "adr": false
  }
}
```

`version` is the installed `mattpocock-skills` plugin version, read from `~/.claude/plugins/`. Every field except `schemaVersion` is optional.

`anchors` is why this workflow runs once per repo: it records whether `CONTEXT.md`, `docs/agents/`, `DESIGN.md`, and `docs/adr/` exist, so `/firehorse:map` and the rest read one manifest field instead of probing the tree on every invocation. `/firehorse:index` refreshes `anchors.design` and fills in `anchors.codebase` and `index`.

Machine-specific facts stay out. Whether supermemory or the graph is reachable on this machine is what `index.supermemory` and `index.graph` report, not something a committed manifest can claim.

## Gotchas

- No remote means the tracker cannot work. That is a stop-and-ask, not a warning to carry past.
- `gh label create` fails on a label that already exists. An existing label is left alone, and its name still belongs in the report.
- A project with no UI surface has no `DESIGN.md` to write. Absent is a valid outcome, recorded in one line.

## Procedure

1. **Establish the repo.** Initialise it when the path has no `.git`, and confirm the GitHub remote with `git remote -v`. No remote → create it with `gh repo create`, or stop and ask.
   → Done when: `git remote -v` names a GitHub remote.

2. **Follow `mattpocock-skills:setup-matt-pocock-skills`.** It is user-invoked only, so read its `SKILL.md` at the path in [Supporting Capabilities](#supporting-capabilities) and carry out its steps: explore, present, and confirm with the human as it specifies, then write `docs/agents/` and the `## Agent skills` pointer block.
   → Done when: all three `docs/agents/` files exist and the human confirmed them.

3. **Create the labels** with `gh label create`, from the table in `docs/agents/triage-labels.md`, plus `wayfinder:map` and the four `wayfinder:<type>` labels.
   → Done when: every label in that set exists in the tracker, and you know which ones you created versus found.

4. **Write `.firehorse/manifest.json`** in the shape under [Manifest shape](#manifest-shape), with `anchors.context`, `anchors.agents`, `anchors.design`, and `anchors.adr` set from what now exists on disk.
   → Done when: the file parses, `setup.mattPocockSkills.version` matches the installed plugin, and all four `anchors` booleans are present.

5. **Interview for `DESIGN.md`.** Run `mattpocock-skills:grilling` and `mattpocock-skills:domain-modeling` on one question: what should this product look and behave like, stated as direction rather than as a description of what exists. Then set `anchors.design` to match the outcome.
   → Done when: `DESIGN.md` exists and `anchors.design` is `true`, or its absence is recorded in one line with the reason and `anchors.design` is `false`.

6. **Call `/firehorse:index`.** It runs the graph and supermemory passes, writes the derivable anchors under `docs/codebase/`, and records `index.commit`, `index.at`, `anchors.codebase`, and `anchors.design` into the manifest you just wrote.
   → Done when: `/firehorse:index` has reported each of its passes.

7. **Commit** the setup output, the manifest, `DESIGN.md`, and the anchors in small, reviewable commits.
   → Done when: the working tree is clean.

8. **Report what exists and what is absent:** the remote, the `docs/agents/` files, the labels you created versus the ones already there, the manifest fields, whether `DESIGN.md` exists, and the `/firehorse:index` result.
   → Done when: every one of those six is stated, including the absences.

## Projection Notes

`packages/firehorse-core/src/setup/` owns the schema that validates the manifest shape above, and `packages/firehorse-claude/hooks/check-setup.mjs` reads it without importing from the workspace.
