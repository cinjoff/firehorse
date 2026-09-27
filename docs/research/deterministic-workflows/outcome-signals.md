# Outcome signals: how an external machine learns how a workflow step ended

An XState machine outside Claude Code needs to know how each Firehorse workflow run ended. It
needs three things: which `## Handoff` variant applies, whether the gate was green, and whether
a ticket closed. It has to learn this without driving the session through `claude -p`. This
note lists the signals that carry those facts, how reliable each one is, and where each one
breaks.

**Window:** researched 2026-09-27, against the workflow definitions at `142de0e` and
`code.claude.com/docs/en/hooks.md` fetched the same day (330,771 bytes).

**Status:** research. Nothing here is a plan of record.

## The short answer

- **No single signal is enough.** The tracker and git are deterministic but cannot say which
  session did the work. `last_assistant_message` knows which session it came from, but its
  content is model-authored, and it only exists at a `Stop`.
- **The workable design pairs the two.** A machine-readable handoff line, emitted on every
  exit path, names the claimed outcome and the ticket. The machine then confirms that claim
  against the tracker and git before it takes the transition. This is the split from
  Foreman: the model proposes, code checks (`../next-action-hook/foreman-gates.md`).
- **The gate is the weakest signal.** Only `/firehorse:ship` leaves durable gate evidence, as
  PR checks. `build` and `fix-bug` keep theirs only in prose, in a ticket comment. The one
  deterministic way to learn "gate green" after a build is for the machine to re-run the gate
  on the commit.

## The signals

### 1. The `Stop` hook

**What it carries.** A `Stop` payload carries these keys: `background_tasks`, `cwd`, `effort`,
`hook_event_name`, `last_assistant_message`, `permission_mode`, `prompt_id`, `session_crons`,
`session_id`, `stop_hook_active` and `transcript_path`. This list was observed on CLI 2.1.278
and is recorded in the [#252 map body](https://github.com/cinjoff/firehorse/issues/252),
under "A `Stop` payload has no `source` field", from #259.

- **`scratchpad_dir` is missing.** It is documented as a common field
  (hooks.md "Common input fields", ~line 742), but it is absent in practice (D-182,
  `docs/DECISIONS.md:3383`).
- **`last_assistant_message` is the text of the final response** (hooks.md ~line 2538).
- **Do not use `transcript_path` for the current turn.** It is written asynchronously and "may
  not yet include the current turn's most recent messages" (hooks.md ~line 738;
  `../next-action-hook/hook-surface.md:15-16`).

**Getting the payload to the machine.** No `claude -p` is needed.

- **HTTP hook.** A `type: "http"` hook POSTs the same JSON to a URL (hooks.md ~line 409 and
  "HTTP hook fields" ~line 505).
- **Failure is silent.** A non-2xx status, a connection failure or a timeout is a
  **non-blocking error** (hooks.md "HTTP response handling" ~line 900). A machine that is down
  therefore misses the event rather than blocking the session. That is fail-open, but it also
  means the event is lost.
- **Admin allowlists can drop it.** `allowedHttpHookUrls` can refuse the URL (hooks.md ~line
  282).
- **The durable alternative.** A command hook that appends the payload to a per-session queue
  file keeps the event.

**How reliable it is, and where it breaks.**

- **`Stop` fires per turn, not per workflow.** Several workflows stop mid-run to ask the user
  something:
  - `build` step 3 (seam confirmation, `build.md:114-115`);
  - `tickets` step 4 (the quiz, `tickets.md:124-125`);
  - `upstream-scan` steps 6 and 7 (`upstream-scan.md:137-141`).

  A `Stop` whose `last_assistant_message` carries no block therefore means either "finished
  without a handoff" or "paused for input". The text cannot tell them apart. See the table
  below: many variants are defined as *no block*.
- **User interrupts and API errors never reach `Stop`.** `Stop` "does not run if the stoppage
  occurred due to a user interrupt". API errors fire `StopFailure` instead (hooks.md ~lines
  2525-2528). An interrupted run looks like silence. A machine listening only to `Stop` waits
  forever and needs a timeout, or needs `StopFailure` and `SessionEnd` as well.
- **The session may not be done.** Non-empty `background_tasks` or `session_crons` mean
  "paused, will wake" (hooks.md ~line 2540). A block in the text alongside a running
  background task is not a finished run.
- **A block reads as final only if nothing follows it.** Every Handoff says "with nothing
  following it". `last_assistant_message` is the whole final text, so the block is its tail
  only if the model obeyed.
- **The text is a claim.** The block is advice the model wrote. D-182 already relies on
  `last_assistant_message` "to see whether a block was rendered" and derives the rest from git
  and the tracker (`docs/DECISIONS.md:3383-3391`).

**Knowing which workflow was running.** `Stop` does not name the workflow.
`UserPromptExpansion` fires when the user types `/firehorse:build 218`. It carries
`command_name`, `command_args`, `command_source`, `session_id` and `prompt_id` (hooks.md
~lines 1385-1405).

- **Keying.** Store `(session_id → last expansion)` and join the next `Stop` on `session_id`.
  `prompt_id` also matches when the workflow finishes within the same prompt.
- **Nested runs are invisible to it.** `new-project` step 6 calls `/firehorse:index`
  (`new-project.md:127`). A workflow invoked through the `Skill` tool rather than typed
  bypasses `UserPromptExpansion`. It shows up only on `PreToolUse` or `PostToolUse` with a
  `Skill` matcher (`hook-surface.md:62-64`).

### 2. A machine-readable handoff line

This signal does not exist today. The candidate is item 4 in `README.md:135-137`. The idea is
that every exit path ends with one line of JSON, including the paths that render no block:

```
firehorse:outcome {"workflow":"build","ticket":218,"outcome":"gate-red","gate":"pnpm test","next":null}
```

**What it fixes.**

- It turns "no block" into a named outcome, which separates paused runs from finished ones.
- It names the ticket, which the tracker cannot attribute to a session (see signal 5).
- It gives the machine an event to validate against its current state. The model names the
  event and the machine checks that it is legal.

**How reliable it is.**

- **It is still model-authored.** Expect the omission and misreporting rates of any
  instruction-following. Nothing in the corpus measures them.
- **It must be linted.** A parser check, in the manner of D-180, has to confirm every Handoff
  declares its outcome vocabulary. A `Stop` or `type: "prompt"` hook can then block a turn
  that ends a workflow without the line. `decision: "block"` is bounded by `stop_hook_active`
  and the eight-continuation cap (hooks.md ~line 2536).
- **It never replaces the confirming check.** It only tells the machine which check to run.

### 3. Superset session status: unknown

**What exists.** Firehorse knows Superset only as an optional MCP server at
`https://api.superset.sh/api/v2/agent/mcp`
(`packages/firehorse-claude/skills/firehorse-setup/SKILL.md:77`). #264 found an underscored
`session_id` field on one transcript record and identified it as a Superset field that clean
transcripts lack (#252 map body, the #264 decision line).

**What is not known.** Whether Superset exposes a per-session status (working, idle,
needs-input, ended) that an outside process can read has not been established.

**Why it matters.** If it does, it is the obvious answer to the "paused or finished"
ambiguity in signal 1, and to the silent interrupt.

This is a **dependency on the sibling ticket** that investigates Superset. Nothing in this
note assumes it.

### 4. Git

**What is deterministic.**

- Commits on the branch (`git log <base>..HEAD`).
- A clean tree (`git status --porcelain`). This is `build` step 8 and `fix-bug` step 8
  (`build.md:131-132`, `fix-bug.md:116-117`).
- Tags `v<version>` pointing at the merge commit (`ship.md:156-157`).
- A commit touching `.firehorse/manifest.json` together with `docs/codebase/` (`index.md:124-125`).

**What it is good for.** Confirming that work landed.

**What it cannot say.**

- It cannot say whether the gate passed.
- It cannot say whether a commit came from this session. Concurrent sessions share a worktree,
  and worktrees isolate the checkout, not the sessions (D-182).

**The manifest is per-checkout.** The tracked `.firehorse/manifest.json` on this branch
records `index.graph: false` at `5813940`. The #252 Notes say the manifest records
`graph: true` at `a22c83c`. Read the manifest from the commit the run produced, not from
whatever is on disk.

### 5. The GitHub tracker

**What is deterministic.**

- Issue `state` and `state_reason`.
- `closed_at`.
- Comments, and their `created_at`.
- Labels: `wayfinder:map`, `ready-for-agent`, `ready-for-human`, `candidate`,
  `eval:proposed`.
- Native sub-issues, and each one's `issue_dependencies_summary.blocked_by`.
- The assignee, which is the claim.
- The frontier query. It is REST-only and is written out in
  `docs/agents/issue-tracker.md:62-143`.
- PR `state` and `mergeCommit`, `gh pr checks`, and `gh release view`.

**How reliable it is, and where it breaks.**

- **Every write is made as the same GitHub user.** Two sessions on one map cannot be told
  apart by the actor. Attribution needs the ticket number from the handoff line or from
  `command_args`, plus a time window running from the `UserPromptExpansion` to the `Stop`.
- **Resolution comments are prose.** They are detectable by presence and timing, not by
  content.
- **Reads can be stale.** An API read taken immediately after `gh issue close` may briefly
  show the old state. Re-read before transitioning.
- **Filed issues are hard to identify.** Issues filed by `upstreams-check` step 6 carry no
  label (`upstreams-check.md:110-111`). They are identifiable only by `created_at` and a body
  that references definition paths.

## Handoff variant table

"Block" means the rendered `## ▶ Next` block, and "none" means the definition says no block
renders.

**Signal codes:**

| Code | Signal |
|---|---|
| **S** | `Stop.last_assistant_message` contains the block |
| **E** | `UserPromptExpansion` gives the workflow and its arguments |
| **L** | The proposed handoff line |
| **G** | Git |
| **T** | Tracker |

The deterministic confirmation is the G and T column. S and L say which variant was
*claimed*.

| Workflow | Variant (▶ Next chosen) | Condition as written | Signals that determine it | Failure mode |
|---|---|---|---|---|
| build | **Ship #\<ticket\>** → `/firehorse:ship`, no `/clear` | Gate green and proof moved (step 7), committed, ticket comment posted and issue still open (`build.md:129-135`, block `141-153`) | S or L gives the variant. G: tree clean, new commits on the branch. T: a new comment on #ticket after the expansion time, and state `open`. **Gate:** only as pasted text in that comment. For a deterministic answer, the machine re-runs the gate at HEAD. | A model that skips the gate still renders the block. Comment text is not parseable evidence. CI runs only typecheck, build and test (`.github/workflows/ci.yml:38-47`), not `definitions:check` |
| build | none: **red gate** | "A red gate ends the run at step 7, and the block goes with it" (`build.md:156`) | S: no block. L: `gate-red` plus the failing command. G: possibly an uncommitted tree. T: no step-9 comment. The machine re-running the gate confirms red. | Without L this looks the same as a pause at step 3 or an interrupt |
| build | none: **frontier reported** | Ticket reaches a map, and the run reports a frontier and stops (`build.md:109`) | L only. T: the ticket is a `wayfinder:*` child (parent lookup) | Not expressed as a Handoff variant at all. Invisible without L |
| fix-bug | **Ship the fix for #\<ticket\>** → `/firehorse:ship` | Regression evidence plus a green gate (step 7), clean tree, comment posted and issue open (`fix-bug.md:113-120`, block `126-138`) | Same as build: S or L, G clean with commits, T a new comment with the issue open. Gate by re-run. | Same as build |
| fix-bug | none: **unreproduced** | "Where the step-2 loop never went red, the run stops there and the block does not render" (`fix-bug.md:141`) | L `unreproduced`. G: no commits. T: no comment | Looks the same as an interrupt, or as a long diagnosis turn |
| index | **Chart the map** → `/clear`, `/firehorse:map` | All passes succeeded (`index.md:138-148`) | S or L. G: one commit carrying the manifest and anchors, whose parent is the step-1 SHA (`index.md:124-125`). The manifest at that commit has `index.graph: true` and `index.commit` equal to the parent | The manifest drifts per checkout (see signal 4) |
| index | **Offer the fix, not the map** | "Where the graph pass failed" (`index.md:148`) | G: the manifest at the new commit has `index.graph: false`. This is fully deterministic. | The fix command is not specified, so the variant has no fixed text to match in S |
| index | none: **called by new-project** | "Skip the block entirely when `/firehorse:new-project` called this run" (`index.md:146`) | E shows `new-project`, not `index`. `index` arrived through the Skill tool. Only one `Stop` fires, at the end of new-project | Correct by construction, as long as the machine keys on the typed command |
| map | **Resolve #\<ticket\>** → `/clear`, `/firehorse:map <map> <ticket>` | The map has open, takeable children. Name the ticket the map leaves open (`map.md:145-160`, `194`) | T: this session's ticket is closed with a resolution comment, and the map body gained a Decisions-so-far line (`issue-tracker.md:130-140`). The frontier query returns ≥1 open, unblocked, unassigned child. **Which** child is named needs S or L | "Route on what the map holds now" means a concurrent session can change the frontier between `Stop` and the check. Two closes in one window cannot be attributed |
| map | **Spec it** → `/clear`, `/firehorse:spec <map>` | "No open children and nothing under `## Not yet specified`", and no spec yet (`map.md:162-177`) | T: sub-issues with `state=="open"` number 0. The map body's `## Not yet specified` section is empty. There is no spec link in the map body | "Nothing under" is a text parse of the map body, with HTML comments as placeholders (`<!-- fog -->`) |
| map | **Amend the spec** → `/firehorse:spec <map>` (no drawn block) | Complete map with a spec, and "tickets have closed since that spec was written" (`map.md:179`) | T: a spec link in the map body, and some child `closed_at` > the spec's `created_at` (or its last dated amendment) | Amendments are dated in prose (`spec.md:111`). The last-amended time is not a field |
| map | **Slice it** → `/clear`, `/firehorse:tickets <spec>` | Complete map with a spec, and nothing closed since (`map.md:179-191`) | T: as above, with no child `closed_at` after the spec | Same as above |
| map | **Build** (Notes override) | "An effort whose `## Notes` carries execution into the map" (`map.md:196`) | T: parse the map `## Notes` for the authorising line. S or L names it | A judgment on prose. Not deterministic |
| map | none: **all blocked** | "Every child blocked and none takeable → … offer nothing else" (`map.md:197`) | T: every open child has `blocked_by>0` or an assignee. This is fully deterministic | Assignees left behind by dead sessions look like "taken" |
| map | none: **decision destination** | "The destination was a decision rather than a change → the map ends at step 6" (`map.md:198`) | L only. T: the map may be closed | A judgment call. Invisible without L |
| memory | none, **by design** | "This workflow renders no handoff block" (`memory.md:88-94`) | S: the one-line URL report. A `background_tasks` entry of type `shell` for the server (hooks.md ~line 2540). `GET /api/health` returns `ok` (`memory.md:79-80`) | The server outlives the session, so "done" is not "stopped" |
| new-project | **Chart the first map** → `/clear`, `/firehorse:map` | Setup complete (`new-project.md:136-150`) | G: a clean tree with commits carrying `.firehorse/manifest.json` and `docs/agents/*`. The manifest has four `anchors` booleans. T: the `wayfinder:*` labels exist | Multiple commits (step 7), so there is no single "this run" commit |
| new-project | same block **plus "DESIGN.md absent"** | "User declined the interview → say so inside the block" (`new-project.md:154`) | G: the manifest has `anchors.design: false` and there is no `DESIGN.md`. This is fully deterministic | None worth noting |
| ship | **Back to the map** → `/clear`, `/firehorse:map` | Merged, tagged, released, issues closed (`ship.md:159-166`, block `172-182`) | T: the PR is `MERGED` with a `mergeCommit`, `gh release view v<version>` exists, and each issue from step 4 is `closed` with a comment naming the tag. G: both tags point at the merge commit. **Gate:** PR checks exist, but CI covers only 3 of the 7 gate commands (`ship.md:74-86` against `ci.yml`) | The "\<n\> issues" count depends on which issues step 4 chose. Tag signals can race the release |
| ship | none: **blocked** | "A blocked PR, a red gate at step 1, or a review that found something all end the run in place" (`ship.md:185`) | T: no PR, or the PR is `OPEN`, or the checks are red. G: no new tag. L names which of the three | The three sub-causes cannot be told apart without L |
| spec | **Slice it** → `/clear`, `/firehorse:tickets <spec>` | Spec written and published (`spec.md:126-130`, block `136-150`) | T: a new spec issue, created in the window, with no `ready-for-agent` label, and the map body links it (`spec.md:127`) | Finding "the spec" means diffing the map body |
| spec | **`/firehorse:map` only** | "A map that failed step 2 gets the `/firehorse:map` line as its only offer" (`spec.md:153`) | T: the map has an open child, or content in `## Not yet specified`. This is deterministic, and it is the same check as map's "Spec it", negated | Also covers "a spec, nothing closed since → routes to `/firehorse:tickets`" and "no closed children → stops" (`spec.md:112-113`). Those are routes with no block defined |
| spec | **also `/firehorse:build <spec>`** | "Only where the spec names one behaviour at one confirmed seam" (`spec.md:154`) | S or L only | A judgment on spec content |
| tickets | **Build #\<ticket\>** → `/clear`, `/firehorse:build <ticket>` | Slices published and triaged (`tickets.md:127-134`, block `140-154`) | T: new sub-issues of the spec, with blocking edges wired, and every slice labelled. The frontier is non-empty with ≥1 `ready-for-agent` slice. **Which** slice (the tracer bullet) needs S or L | "Name the tracer bullet" is a judgment. The frontier is deterministic, the pick is not |
| tickets | none: **all HITL** | "Every frontier slice is HITL → say so" (`tickets.md:158`) | T: every frontier slice is `ready-for-human`. This is fully deterministic | None worth noting |
| triage | **Chart the new map** → `/clear`, `/firehorse:map` | "Only when step 3 chartered a map" (`triage.md:109`) | T: an issue labelled `wayfinder:map` whose `created_at` falls in the window | Attribution window only |
| triage | none: **no new map** | "No new map, no handoff" (`triage.md:123`) | T: no such issue | Looks the same as a pause |
| upstream-scan | **Place the new candidates** → `/clear`, `/triage` | "Only when step 9 filed at least one issue" (`upstream-scan.md:157`) | T: issues labelled `candidate` and `eval:proposed` created in the window (`.github/ISSUE_TEMPLATE/candidate.yml:4`). G: the ledger file updated by `--record` | The ledger is under `.firehorse/local/` and is probably untracked |
| upstream-scan | none: **nothing filed, or declined at step 7** | `upstream-scan.md:157`, `171` | T: no new `candidate` issue | Looks the same as a pause at step 6 or 7. L is needed |
| upstreams-check | **Work the drift** → `/clear`, `/firehorse:map` | "Only when step 6 filed tickets" (`upstreams-check.md:121`) | T: issues created in the window whose bodies cite `packages/firehorse-core/definitions/` | The issues carry no label. This is the weakest tracker attribution in the set |
| upstreams-check | none: **clean or advisory-only** | `upstreams-check.md:135-136` | T: nothing filed. The `pnpm upstreams:check` exit status is observable only if the machine re-runs it | None worth noting |

**What the table shows.**

- **Deterministic from git and the tracker alone.** Six variants resolve from git and the
  tracker without any text:
  - index graph-failed;
  - map all-blocked;
  - map spec-it;
  - new-project DESIGN-absent;
  - tickets all-HITL;
  - spec map-only.
- **Deterministic once the ticket is known.** Most of the rest resolve from the tracker once
  the machine knows the ticket and the time window.
- **A judgment only the model makes.** These need S or L:
  - map Resolve (which child);
  - map Notes-override;
  - map decision-destination;
  - spec build-route;
  - tickets tracer-bullet;
  - build frontier-stop.
- **Silence with more than one cause.** Every "none" variant except memory can be confused
  with a pause or an interrupt. This is the strongest case for L.

## What is lost across `/clear`, fork and resume

The facts below are recorded in the [#252 map body](https://github.com/cinjoff/firehorse/issues/252)
(Decisions so far, #259 and #264), in D-182, and in `../next-action-hook/`.

### `/clear`

- **Everything that identifies the session changes.** `/clear` mints a new `session_id` and a
  new transcript file.
- **Nothing links the two sessions.** Nothing points back in either direction.
  `SessionStart` fires with `source: "clear"` (hooks.md ~line 1138), but it already carries
  the new id and names no predecessor.
- **Nothing can be matched across it.** History is discarded, so there are no shared `uuid`s
  to re-anchor on. `cwd` is the only field that survives, and concurrent sessions share it: 19
  of 26 multi-session directories have overlapping pairs (D-182).
- **The block is the only carrier.** It crosses the clear only because the user reads it
  (D-182). For the machine, the last `Stop` of the old session is the last thing it sees
  under that id.
- **An unverified way to pair sessions.** Two documented events bracket the clear:
  - `SessionEnd` with `reason: "clear"`, carrying the **old** id (hooks.md ~line 3308,
    reason table);
  - then `SessionStart` with `source: "clear"`, carrying the **new** id.

  Pairing them by adjacency is ambiguous under concurrency. Pairing by the hook process's
  parent PID might not be, because the Claude Code process survives the clear. That is an
  untested hypothesis and worth one cheap experiment. `SessionEnd` has a 1.5 s default
  budget, so an append-to-file hook is all it can do.
- **The plugin hook would not see it today.** The plugin's `SessionStart` matcher is
  `startup|resume` (`packages/firehorse-claude/hooks/hooks.json:7`), so it does not fire on a
  clear.

### Fork

- **The file and the id change, the message history does not.** A fork writes a new file
  under a new id and rewrites `sessionId` on every record. It still carries every parent
  `uuid`, in order.
- **Nothing in the forked file points back.** `SessionStart` with `source: "fork"`, plus the
  `uuid` overlap, is the only way to re-anchor (#259).
- **`Stop` alone cannot recognise a fork.** It has no `source` field.
- **Risks for the machine:**
  - It sees a new id with no expansion history.
  - A transcript reader may double-count the parent's handoff block, which reappears under
    the new id.
  - Both branches can go on to act on the same ticket.

### Resume

`/resume` appends to the same file under the same id and keeps byte offsets (#259). Nothing is
lost.

### Compaction

Compaction resets meaning, not bytes. The file is never truncated. `last_assistant_message`
is unaffected.

## Recommendation for the machine

1. **Subscribe.** Listen to `UserPromptExpansion` (workflow and arguments), `Stop` (the tail
   text), `StopFailure` and `SessionEnd` (termination), and `SessionStart` with
   `clear|fork|resume` (lineage). Use HTTP hooks, or a command hook appending to a queue.
2. **Treat S or L as the proposed event.** Take no transition until the matching G and T
   check from the table passes.
3. **Own the gate.** Re-run the gate at the reported HEAD for `build` and `fix-bug`. For
   `ship`, read PR checks and still re-run the four commands CI does not cover.
4. **Handle silence explicitly.** A `Stop` with no L while no expected tracker change has
   happened means "paused". Hold state, with a timeout.
5. **Get the handoff line.** Ask the definitions ticket for L, with a closed outcome
   vocabulary per workflow that `definitions:check` lints. It is the only way to cover the
   judgment variants and the ambiguous silences.

## Sources

- `packages/firehorse-core/definitions/workflows/{build,fix-bug,index,map,memory,new-project,ship,spec,tickets,triage,upstream-scan,upstreams-check}.md`,
  the `## Handoff` sections and procedure steps, at the line numbers cited above
- `docs/agents/issue-tracker.md:36-143`
- `docs/DECISIONS.md:3383-3400` (D-182)
- `.github/workflows/ci.yml`
- `.github/ISSUE_TEMPLATE/candidate.yml`
- `packages/firehorse-claude/hooks/hooks.json`
- `packages/firehorse-claude/hooks/next-action-probe.mjs`
- `packages/firehorse-claude/skills/firehorse-setup/SKILL.md:64-77`
- `docs/research/next-action-hook/hook-surface.md`, `design.md`, `README.md` and
  `foreman-gates.md`; `docs/research/deterministic-workflows/README.md`
- https://github.com/cinjoff/firehorse/issues/252: map body; decisions from #259, #264, #255
  and #256
- https://code.claude.com/docs/en/hooks.md, fetched 2026-09-27. Sections used:
  - Common input fields
  - SessionStart `source`
  - UserPromptExpansion
  - Stop input
  - StopFailure
  - SessionEnd reason table
  - HTTP hook fields
  - HTTP response handling
