# Issue tracker: GitHub

Issues and PRDs for this repo live in GitHub Issues for `cinjoff/firehorse`. Use the `gh` CLI for issue operations when a Matt Pocock engineering skill says to publish, fetch, label, comment on, or close an issue.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments`
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `gh issue edit <number> --remove-label "..."`
- **Close an issue**: `gh issue close <number> --comment "..."`

Run `gh` commands from inside this repository so the CLI infers `cinjoff/firehorse` from `git remote`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue in `cinjoff/firehorse`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments` and inspect the issue body, labels, and comments.

## Local files vs GitHub

Planning Workspace artifacts, PRDs, issue drafts, reviews, and handoffs may live in repo docs, but published work items live in GitHub Issues unless the user explicitly says otherwise.
