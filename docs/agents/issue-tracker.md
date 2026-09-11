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

## Wayfinding operations

`mattpocock-skills:wayfinder` keeps a map and its child tickets on the tracker
and leaves the physical expression to this file. Here it is GitHub Issues, and
every command below was run against this repo.

**The map** is an issue labelled `wayfinder:map`. Its tickets are **native
sub-issues** of it, labelled `wayfinder:decision`, `wayfinder:research`,
`wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.

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
