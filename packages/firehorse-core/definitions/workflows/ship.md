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
  orchestration:
    - subagents
    - review-gates
upstreamSkills:
  - upstream: mattpocock-skills
    id: code-review
---

# Ship

## Purpose

Use this workflow to close out finished work. No upstream skill covers the release sequence, so this workflow owns it end to end: the gate, the review, the PR, the merge, the changelog, the tag, the release, and the issue closures. It earns its place by making the sequence a single ordered path with a hard gate at the front, so a release never goes out ahead of a green `pnpm typecheck && pnpm test && pnpm definitions:check` and no issue is closed without the commit or release that resolved it named in the closing comment.

## Usage

Invoke the generated command with the base branch, optionally a release version, and optionally the issue numbers this work resolves. `$ARGUMENTS` carries them. With no arguments, the base is the repo's default branch and you infer the issues from the commit messages.

## Inputs

- `$ARGUMENTS`: base branch, release version, issue numbers.
- `git log <base>..HEAD --oneline` and `git diff <base>...HEAD`.
- `CHANGELOG.md` and the six version fields listed under [Version sites](#version-sites).
- The issues the commits reference.

## Outputs

- A `/code-review` report against the merge-base, with every blocker either fixed or named on the PR.
- A PR opened with `gh pr create`, its body linking each ticket as a markdown link by title.
- A merge, once checks pass.
- A `CHANGELOG.md` entry under a new version heading.
- Every version site bumped to the same number in one commit.
- Two git tags — `v{version}` for the repo, `{plugin}--v{version}` for the plugin.
- A GitHub release.
- One closing comment per resolved issue, naming the commit or the release tag.

## Supporting Capabilities

- Upstream skill: `mattpocock-skills` / `code-review` for the two-axis review of the diff.
- Required: git, `gh`, the `claude` CLI for `plugin validate` and `plugin tag`, and a shell to run the gate and the build.
- Optional: subagents, which `code-review` uses to run its two axes in parallel.

## Orchestration Intent

You drive the sequence in order and stop at the first red step. `code-review` runs before the PR exists, against the merge-base, so its findings land as commits rather than as review comments on your own PR. The merge waits for CI; the tag waits for the merge; the issue closures wait for the tag, so a closing comment can name a released version rather than a branch.

## Safety Gates

- Do not open a PR before all five gates are green: `pnpm typecheck`, `pnpm test`, `pnpm definitions:check`, `pnpm build`, and `pnpm upstreams:check`. Paste the output.
- Do not open a PR before `claude plugin validate .` and `claude plugin validate packages/firehorse-claude` both pass. No pnpm gate reads the plugin manifest, so a manifest that lists a file which no longer exists ships a broken plugin and every other gate stays green.
- Do not open a PR while `code-review` has an unresolved blocker. Fix it, or state on the PR why it stands.
- Do not commit directly to the default branch. Branch first.
- Do not merge before the PR's checks pass.
- Do not tag a commit that is not the merge commit.
- Do not bump one version site and leave another behind. `claude plugin tag` refuses when `plugin.json` and the marketplace entry disagree, and that refusal is the only automated check on the set — the other four sites drift silently.
- Do not publish `firehorse` to npm. D-136 makes this personal tooling; the package is unpublished and stays that way. A release here is a tag plus a GitHub release, nothing more.
- Do not close an issue whose resolution you cannot name — the commit, the PR, or the release tag.
- Do not reference a ticket by a bare number anywhere a human reads it. A title wraps its link.
- Do not hand-edit a generated mirror. When the diff touches `packages/firehorse-claude/commands/firehorse/` or `packages/firehorse-claude/skills/firehorse/`, confirm those files came out of `pnpm definitions:write` and not out of an editor.

## Procedure

1. Establish the base. Resolve it with `git rev-parse <base>` and confirm `git diff <base>...HEAD` is non-empty. List the commits with `git log <base>..HEAD --oneline`.
2. Run the gate: `pnpm typecheck`, `pnpm test`, `pnpm definitions:check`, `pnpm build`, `pnpm upstreams:check`. Then validate the plugin surface: `claude plugin validate .` and `claude plugin validate packages/firehorse-claude`. Keep the output; a red gate ends the run.
3. Run `code-review` against the base as the fixed point. Fix every blocker that is in scope as a commit on this branch; report the rest.
4. Identify the issues. Take them from `$ARGUMENTS`, or from the issue references in the commit messages. Read each with `gh issue view <number> --comments` so the PR body can describe what was asked for.
5. Open the PR with `gh pr create --base <base> --head <branch>`. The body states what changed, links each ticket as a markdown link by its title, and lists the gate output.
6. Wait for the PR's checks. Green, merge it. Red, fix on the branch and push; do not merge past a red check.
7. Write the `CHANGELOG.md` entry under a new version heading: what changed, by user-visible effect, not by file. Describe the plugin surface a user sees — commands, skills, hooks, and the dependencies the install pulls — not the definitions that generated it.
8. Bump every version site to the same number in one commit. See [Version sites](#version-sites); confirm with the `grep` there that nothing was missed.
9. Tag the merge commit twice. `git tag -a v<version>` carries the repo; `claude plugin tag packages/firehorse-claude --push` carries the plugin. The second is what `/plugin update firehorse@firehorse` resolves against, so a release without it is invisible to every installed copy. Run it with `--dry-run` first and read back the name and version it reports.
10. Publish with `gh release create v<version>` using the changelog entry as the body. The plugin's `check-update.mjs` hook compares the manifest version against the latest GitHub _release_, so a tag without a release leaves the hook silent.
11. Close each resolved issue with `gh issue close <number> --comment "..."`, naming the release tag and the PR by title.
12. Report the PR, both tags, the release, and every issue you closed.

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

## Projection Notes

The Claude mirror is a static command generated from this definition. It records the release sequence as instructions; it runs no release automation of its own, and it adds no hook. Run `pnpm definitions:write` after editing; the mirror is never hand-edited.

The mirror is itself one of the generated files a release ships, so editing this definition and forgetting `pnpm definitions:write` leaves `definitions:check` red at step 2 rather than shipping a stale command.
