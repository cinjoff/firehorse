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

## Parked concepts

An idea whose surface shipped, changed, or is not ready to act on stays as an open
issue labelled `concept` and `parked`, rather than being closed. Closing a stale
issue then does not lose the idea, because the concept issue inherits it and the
closing comment points there. `#57`-`#62` are the current set.

A parked concept is not a work item. It carries no frontier position, no assignee
and no dependencies, and it is not a `wayfinder` ticket. It becomes work when a
map is chartered against it, which is how `#61` became
[#122](https://github.com/cinjoff/firehorse/issues/122).

## Evaluation candidates

A tool, repo, skill, or workflow proposed for Firehorse to take in is filed
through the `Evaluation candidate` issue form, not as a free-form issue. The
form lands it with `candidate` and `eval:proposed` and requires the five fields
the intake gate asks for. The gate, the trial method, and the retro loop that
generates most candidates are in
[`docs/EVALUATION-FRAMEWORK.md`](../EVALUATION-FRAMEWORK.md).

```sh
gh issue create --template candidate.yml                 # file one
gh issue list --label candidate --state open             # the backlog
gh issue list --label eval:shortlisted --state open      # what is waiting on a trial
gh issue list --label optional-dep --state open          # needs a third-party dependency
```

A candidate carries exactly one `eval:` label at a time and moves
`eval:proposed` to `eval:shortlisted` to `eval:trialling` to `eval:adopted` or
`eval:rejected`. Both terminal states need the trial's numbers in the issue; a
rejection without a number is just an opinion and gets re-proposed in a month.
`parked` defers a candidate without closing it, as it does for concepts.

`retro` marks a finding that came out of reading session history rather than
from outside. A retro finding that points at an external tool gets a
`candidate` issue too, which is how the two loops connect.

## Wayfinding operations

`mattpocock-skills:wayfinder` keeps a map and its child tickets on the tracker
and leaves the physical expression to this file. Here it is GitHub Issues, and
every command below was run against this repo.

**The map** is an issue labelled `wayfinder:map`. Its tickets are **native
sub-issues** of it, labelled `wayfinder:research`, `wayfinder:prototype`,
`wayfinder:grilling`, or `wayfinder:task`.

```sh
gh issue list --label wayfinder:map --state open        # find the maps
```

### Wire a child ticket

Sub-issues are not reachable from any `gh issue` flag — `gh` 2.86.0 has none.
Use the REST endpoint, and note it takes the child's numeric **id**, not its
issue number:

```sh
CHILD_ID=$(gh api repos/cinjoff/firehorse/issues/<child> --jq .id)
gh api --method POST repos/cinjoff/firehorse/issues/<map>/sub_issues \
  -F sub_issue_id=$CHILD_ID
gh api --method DELETE repos/cinjoff/firehorse/issues/<map>/sub_issue \
  -F sub_issue_id=$CHILD_ID                             # detach
gh api repos/cinjoff/firehorse/issues/<map>/sub_issues --jq '.[].number'
```

### Express blocking

GitHub's native issue dependencies, again REST-only and again by id. The
GraphQL `Issue` type has no dependency field; it does have `subIssues`, so a
read of the children can go either way.

```sh
BLOCKER_ID=$(gh api repos/cinjoff/firehorse/issues/<blocker> --jq .id)
gh api --method POST repos/cinjoff/firehorse/issues/<blocked>/dependencies/blocked_by \
  -F issue_id=$BLOCKER_ID
gh api --method DELETE \
  repos/cinjoff/firehorse/issues/<blocked>/dependencies/blocked_by/$BLOCKER_ID
gh api repos/cinjoff/firehorse/issues/<blocked>/dependencies/blocked_by --jq '.[].number'
```

Each issue carries an `issue_dependencies_summary`. Its `blocked_by` counts the
blockers still **open**; `total_blocked_by` counts them all. A ticket is
unblocked when `blocked_by` is `0`.

### Query the frontier

Open, unblocked, unclaimed children of one map:

```sh
gh api repos/cinjoff/firehorse/issues/<map>/sub_issues --paginate --jq \
  '.[] | select(.state=="open") | select(.assignees|length==0)
       | select(.issue_dependencies_summary.blocked_by==0)
       | "\(.number)\t\(.title)"'
```

### Claim a ticket

The assignee is the claim, and it goes on before any work so concurrent
sessions skip the ticket:

```sh
gh issue edit <number> --add-assignee @me
```

### Record a resolution

The ticket gets the resolution comment; the map gets one line under
`## Decisions so far` linking it. Then close the ticket — a closed ticket is
off the frontier.

```sh
gh issue comment <number> --body "..."
gh issue edit <map> --body-file <edited map body>
gh issue close <number> --comment "..."
```

**Pass `--jq` to every `gh api` call.** A bare issue payload is thousands of
tokens of repository metadata, and reading twenty of them is most of a session.

## Local files vs GitHub

Planning Workspace artifacts, PRDs, issue drafts, reviews, and handoffs may live in repo docs, but published work items live in GitHub Issues unless the user explicitly says otherwise.
