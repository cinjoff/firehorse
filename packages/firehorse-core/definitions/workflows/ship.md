---
schemaVersion: 1
id: ship
kind: workflow
title: Ship
description: Take verified work from branch to release — review the diff, open and merge the PR, write the changelog entry, bump every version site in step, tag the plugin, publish the release, and close the issues it resolved.
argumentHint: "[base branch | release version] [issue numbers]"
requires:
  tools:
    - read
    - bash
    - edit
  environment:
    - filesystem
    - git
    - github
    - node
    - pnpm
    - claude:cli
optional:
  tools:
    - grep
    - write
    - mcp:codebase-memory-mcp
  orchestration:
    - subagents
    - review-gates
upstreamSkills:
  - upstream: mattpocock-skills
    id: code-review
---

# Ship

## Purpose

Use this workflow to close out finished work. No upstream skill covers the release sequence, so this workflow owns it end to end: the **gate**, the review, the PR, the merge, the changelog, the tags, the release, and the issue closures.

It earns its place by making that sequence one ordered path with a hard gate at the front, so a release never goes out ahead of a green gate and no issue is closed without the commit or release that resolved it named in the closing comment.

## Usage

Invoke the generated command with the base branch, optionally a release version, and optionally the issue numbers this work resolves. `$ARGUMENTS` carries them. With no arguments, the base is the repo's default branch and you infer the issues from the commit messages.

## Inputs

- `$ARGUMENTS`: base branch, release version, issue numbers.
- `git log <base>..HEAD --oneline` and `git diff <base>...HEAD`.
- `CHANGELOG.md` and the six fields under [Version sites](#version-sites).
- The issues the commits reference.

## Outputs

- A `mattpocock-skills:code-review` report against the merge-base, with every blocker either fixed or named on the PR.
- A PR whose body links each ticket as a markdown link by title.
- A merge, once checks pass.
- A `CHANGELOG.md` entry under a new version heading.
- Every version site bumped to the same number in one commit.
- Two git tags — `v{version}` for the repo, `{plugin}--v{version}` for the plugin.
- A GitHub release.
- One closing comment per resolved issue, naming the commit or the release tag.

## Supporting Capabilities

- `code-review` supplies the two-axis review of the diff.
- `codebase-memory-mcp` is optional, and is how step 3 establishes what the diff actually reaches: `trace_path` on each changed public symbol names the call sites a reviewer would otherwise have to find by reading. The `codebase-memory` skill, which that server installs, is the reference for the query syntax.
- Subagents are optional, and are what `code-review` uses to run its two axes in parallel.

## Orchestration Intent

You drive the sequence in order and stop at the first red step. `code-review` runs before the PR exists, against the merge-base, so its findings land as commits rather than as review comments on your own PR. The merge waits for CI; the tags wait for the merge; the issue closures wait for the tags, so a closing comment can name a released version rather than a branch.

## The gate

Seven checks, all green before a PR opens, with the output pasted:

```sh
pnpm typecheck
pnpm test
pnpm definitions:check
pnpm build
pnpm upstreams:check
claude plugin validate .
claude plugin validate packages/firehorse-claude
```

## Version sites

Six fields carry the version, and a release is only coherent when all six agree.

| File                                                   | Field                |
| ------------------------------------------------------ | -------------------- |
| `package.json`                                         | `version`            |
| `packages/firehorse-core/package.json`                 | `version`            |
| `packages/firehorse-claude/package.json`               | `version`            |
| `packages/firehorse-claude/.claude-plugin/plugin.json` | `version`            |
| `.claude-plugin/marketplace.json`                      | `version`            |
| `.claude-plugin/marketplace.json`                      | `plugins[0].version` |

Confirm the set before tagging:

```sh
grep -rn '"version"' package.json packages/*/package.json \
  .claude-plugin/marketplace.json \
  packages/firehorse-claude/.claude-plugin/plugin.json
```

## Safety Gates

- **The whole gate is green before a PR opens.** See [The gate](#the-gate).
- **`code-review`'s blockers are resolved** — fixed as commits on this branch, or stated on the PR with the reason each one stands.
- **Work reaches the default branch through a PR.** Branch first.
- **The merge waits for the PR's checks**, and the tags wait for the merge commit.
- **Every version site moves together.** See [Version sites](#version-sites).
- **A release here is a tag plus a GitHub release.** D-136 makes `firehorse` personal tooling; the npm package stays unpublished.
- **A closing comment names its resolution** — the commit, the PR, or the release tag.
- **A ticket reference a human reads is a title wrapping its link**, never a bare number.
- **Generated mirrors came out of `pnpm definitions:write`.** When the diff touches `packages/firehorse-claude/commands/firehorse/` or `packages/firehorse-claude/skills/firehorse/`, confirm that rather than assuming it.

## Gotchas

- No pnpm gate reads the plugin manifest, so a manifest listing a file that no longer exists ships a broken plugin while every other check stays green. `claude plugin validate` is the only check that catches it.
- `claude plugin tag` refuses when `plugin.json` and the marketplace entry disagree, and that refusal is the only automated check on the version set — the other four sites drift silently.
- `/plugin update firehorse@firehorse` resolves against the plugin tag, not the repo tag. A release without `claude plugin tag` is invisible to every installed copy.
- `check-update.mjs` compares the manifest version against the latest GitHub _release_. A tag without a release leaves the hook silent.
- The mirrors are themselves generated files a release ships, so editing a definition and skipping `pnpm definitions:write` turns `definitions:check` red at step 2 rather than shipping a stale command.

## Procedure

1. **Establish the base.** `git rev-parse <base>`, confirm `git diff <base>...HEAD` is non-empty, and list the commits with `git log <base>..HEAD --oneline`.
   → Done when: the base resolves and the commit list is in hand.

2. **Run the gate** — all seven checks under [The gate](#the-gate), output kept.
   → Done when: every check is green. A red check ends the run.

3. **Run `mattpocock-skills:code-review`** against the base as the fixed point. Where the diff changes a public symbol, `trace_path` it first so the review covers the call sites the change reaches rather than the files it touches. Fix every in-scope blocker as a commit on this branch; report the rest.
   → Done when: no blocker is unresolved and unexplained.

4. **Identify the issues** from `$ARGUMENTS`, or from the issue references in the commit messages. Read each with `gh issue view <number> --comments`.
   → Done when: every issue this work resolves is listed with what it asked for.

5. **Open the PR** with `gh pr create --base <base> --head <branch>`. The body states what changed, links each ticket as a markdown link by its title, and carries the gate output.
   → Done when: the PR exists and its body contains all three.

6. **Merge on green checks.** Red → fix on the branch and push.
   → Done when: the PR is merged and you have the merge commit SHA.

7. **Write the `CHANGELOG.md` entry** under a new version heading, by user-visible effect rather than by file — the plugin surface a user sees, being commands, skills, hooks, and the dependencies the install pulls.
   → Done when: the entry describes effects, and names no definition file.

8. **Bump every version site** to the same number in one commit, confirmed with the `grep` under [Version sites](#version-sites).
   → Done when: all six fields read the same version.

9. **Tag the merge commit twice.** `git tag -a v<version>` carries the repo; `claude plugin tag packages/firehorse-claude --push` carries the plugin. Run the second with `--dry-run` first and read back the name and version it reports.
   → Done when: both tags point at the merge commit and are pushed.

10. **Publish the release** with `gh release create v<version>`, using the changelog entry as the body.
    → Done when: the release is visible on GitHub.

11. **Close each resolved issue** with `gh issue close <number> --comment "..."`, naming the release tag and the PR by title.
    → Done when: every issue from step 4 is closed with a comment naming its resolution.

12. **Report** the PR, both tags, the release, and every issue you closed.
    → Done when: all four are named.

## Projection Notes

This definition records the release sequence as instructions; it runs no release automation and adds no hook.
