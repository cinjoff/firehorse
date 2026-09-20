# Foreman: gates as named probabilities

`thruwire/foreman` answers the second question directly. Instead of asking the working agent
"are we done, did you update the tracker", it asks a separate model, about evidence the agent
does not get to narrate.

Read from `github.com/thruwire/foreman`, cloned 2026-09-20. The repo calls itself "an
architectural experiment, not a claim that this design is already better than a conventional
coding-agent harness," and publishes no accuracy numbers. Treat every number below as a
default somebody picked, not a measured threshold.

## The separation it draws

Two loops running at once. The coding worker keeps its own reason-tool-observe-edit loop.
Foreman watches factory events, asks Jev ten yes-or-no questions about the run as a whole,
and lets ordinary Python decide what to do with the probabilities.

From `docs/theory.md`:

> The model does not command processes. It estimates named probabilities. Python owns
> thresholds, resource limits, lifecycle history, and the legal action vocabulary.

That line is the whole design. It is also the answer to the objection that a model cannot be
trusted to decide whether work is finished: it is not deciding, it is reporting ten numbers
into a policy function you can read.

## The ten gates

Verbatim from `src/foreman/foreman/jev.py`. Every one is a `Noul`, and all ten go out in a
single `system_one` call against the same state.

| Gate | Question |
|---|---|
| `implementation_complete` | Is the implementation work required by the original job complete? |
| `tests_sufficient` | Does the work have sufficient relevant test coverage and passing verification? |
| `requirements_satisfied` | Does the current repository satisfy the original free-form job as a whole? |
| `needs_verification` | Does the current state warrant an independent verification pass before finishing? |
| `meaningful_progress` | Is the active or most recent worker making meaningful progress toward the job? |
| `worker_stuck` | Does the active or most recent worker appear stuck, looping, or unable to advance? |
| `work_off_track` | Is the current work drifting from the original job or making unrelated changes? |
| `agents_md_drift` | When `agents_md_instructions` is present, is the worker's behavior or repository work materially inconsistent with those repository instructions? Answer no when no AGENTS.md instructions are present or the evidence is insufficient. |
| `ready_to_finish` | Given all evidence, is the factory job ready to be declared complete? |
| `needs_human` | Does this situation require human judgment, credentials, clarification, or permission? |

Three details in that table are craft, not decoration:

1. **Each question is atomic.** "Complete" and "tested" and "satisfies the job" are three
   questions, not one. A combined question cannot tell you which half failed.
2. **`agents_md_drift` states its own null case.** "Answer no when no AGENTS.md instructions
   are present or the evidence is insufficient." That is a direct answer to Jev's documented
   literal-reading failure: an unanswerable question still returns a number, so the question
   has to say which number means "cannot tell".
3. **`needs_human` is a first-class gate,** not an error path. The thing the user wants is
   named in the schema.

## The evidence it sends

`FactoryObservation` in `src/foreman/observation.py` is a fixed struct, not a transcript:

`original_job`, `run_id`, `factory_status`, `iteration`, `active_workers`, `worker_history`,
`latest_worker_output`, `worker_exit_status`, `worker_elapsed_seconds`, `git_status`,
`git_diff`, `changed_files`, `agents_md_path`, `agents_md_instructions`, `test_results`,
`verification_results`, `recent_events`, `previous_assessment`, `previous_intervention`,
`attempts`, `failures`, `elapsed_factory_seconds`.

It is truncated on the way in: `diff_limit` 20,000 characters, `output_limit` 12,000,
`field_limit` 50,000, `event_history_limit` 30 events, `worker_history_limit` 10 workers.
Jev's jaggedness page lists "large state full of irrelevant detail" as a failure mode, and
these limits are the response to it.

Note what dominates the struct: `git_status`, `git_diff`, `changed_files`, `test_results`.
The assessment runs on what the repository shows, not on what the agent said it did. That is
the part that matters for "did it actually update the tracker".

## The policy

`src/foreman/policy.py` is 127 lines of plain Python with a stated ordering rule: "safety and
hard limits win before productivity decisions."

```
needs_human ≥ 0.80                              → ESCALATE
iteration ≥ max_iterations (20)                 → ESCALATE
work_off_track ≥ 0.80 | agents_md_drift ≥ 0.80
  | worker_stuck ≥ 0.80                         → STEER_WORKER, else STOP_WORKER
ready_to_finish ≥ 0.75
  ∧ requirements_satisfied ≥ 0.75
  ∧ tests_sufficient ≥ 0.75
  ∧ (verification done ∨ needs_verification < 0.65)  → FINISH
needs_verification ≥ 0.65
  ∧ implementation_complete ≥ 0.75
  ∧ not already verifying                       → START_VERIFIER
otherwise                                       → CONTINUE
```

Three things worth copying:

- **Finishing takes three gates at once.** `ready_to_finish` alone does not end a job.
- **Warnings get a grace period.** After steering a worker, drift and stuck signals are
  ignored for `steering_grace_seconds` (30) so one intervention is not counted twice.
- **Escalation is the terminal state,** reached from a limit as readily as from a
  probability. Running out of iterations and needing a person land in the same place.

Assessment is debounced at `assessment_min_interval_seconds` 5.0 with a periodic sweep every
30 seconds, Jev timeout 10 seconds with two retries on 429 and 5xx, and the run gives up
after `max_consecutive_assessment_failures` 3.

## What transfers to Firehorse, and what does not

**Does not transfer:** the runtime. Foreman is a Python `asyncio` supervisor that owns worker
subprocesses and assesses them while they run. Claude Code hooks do not get a concurrent loop
over a live turn, and Firehorse has no reason to grow one.

**Transfers cleanly:** the gate vocabulary, the atomic-question discipline, the fixed
truncated evidence struct built from `git status` and `git diff` rather than transcript, the
named-probabilities-plus-deterministic-policy split, and the rule that finishing needs
several gates to agree.

**The gate Firehorse needs that Foreman does not have:** tracker state. Firehorse workflows
end on a tracker operation (`/firehorse:map` step 5 resolves a ticket and records the
resolution comment; `docs/agents/issue-tracker.md` defines the wayfinding operations). A
`tracker_updated` noul, fed the `gh issue view` state of the claimed ticket alongside the
diff, asks the question the user is currently asking by hand. It is also the gate most likely
to be answerable deterministically, by checking whether a resolution comment exists, which
makes it a poor candidate for a model call and a good candidate for `gh` in the hook.
