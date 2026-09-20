# The control-theory method

Researched 2026-09-20 by a Firehorse research agent, against Kyle Mistele's AI
Engineer talk [Loop Engineering from First
Principles](https://www.youtube.com/watch?v=xIt_mTQp6mY) (published 2026-07-25,
recorded at 25,470 views and 549 likes when the corpus was gathered, a figure I
took from the corpus rather than re-checking), and against the skill his team
shipped, `design-control-loop` in
[humanlayer/skills](https://github.com/humanlayer/skills), which I read at
commit `ca7c808` on `main`.

**Evidence state.** Mistele is the co-founder of HumanLayer and the talk is
partly a recruiting pitch, which he says out loud at the end. Every number in it
is his own team's internal experience on their own codebase, and there is no
published measurement of the loop he describes, no before-and-after, and no
comparison against a team doing the same Effect migration by hand. I did not run
any of this. What I did verify is that the skill he gestures at exists, is MIT
licensed, has 4.3k stars and 137 forks, and contains the mechanisms the talk
describes rather than a marketing stub. I worked from an automatic transcript,
so speech recognition mangled several proper nouns; where I quote him I have
corrected names in square brackets and left his wording alone.

## Verdict

This is the only source in the corpus that gives you something to build rather
than something to agree with. The control-theory vocabulary earns its keep
because it forces four separate design questions that "put the agent in a loop"
collapses into one, and three of Mistele's mechanisms have no equivalent
anywhere else in the literature: the disturbance dampener, the versioned
feedback file, and the one-open-PR bound.

The framing also has a limit he does not state. Classical control theory assumes
a sensor whose error is continuous and a controller whose gain you can tune.
Mistele's sensor counts violations, which is a discrete measure, and his
controller is a `jq` expression or an agent, neither of which has a gain. So the
analogy buys you a checklist and a vocabulary rather than any of the theory's
results about stability. That is still worth having, and Kevin Mahoney's failure
report in [criticism.md](criticism.md) is what happens to people who skip the
checklist.

## The parts, and why each one is separate

Mistele's frame is the standard feedback control diagram applied to a codebase:

> Control theory is all about how we drive a dynamic system, which would be your
> codebase, towards some desired, stable, or optimal end state. You have a sensor
> that measures the current state of the world. You have your set point, the
> desired state of the world. And the difference between those two things is your
> measured error. You have a controller that reads that measured error and turns
> it into a control signal about an incremental change to apply to the system. We
> have an actuator that applies that change to the system, which is undergoing
> disturbances in the meantime.

He spends a slide making it unintimidating, and the examples are the useful part
of that slide, because they are all systems you already trust. A thermostat.
Kubernetes autoscaling. Infrastructure as code, which compares desired state
against current state and applies an incremental change. Postgres autovacuum and
React's virtual DOM, both of which he calls approximate control loops.

His condition for reaching for one is three questions, and I would treat them as
a gate rather than a description:

> The key questions are, can we find something we can measure? Can we apply
> changes incrementally? And can we get feedback on the quality of those changes?

The value of separating the five components is that in practice they fuse, and
you want to notice when they do. His example of a fused sensor and controller is
a React linting agent that both reports every problem and ranks the top three to
fix. His example of a fused controller and actuator is one agent that picks the
next change and applies it in the same context window. He is relaxed about the
fusing and specific about why the controller deserves its own thought:

> I want to zoom in on the controller a little bit because without one, or
> without a well-tuned one, we might make too large of a change all at once, or
> we might make the wrong change entirely. And if you put that in a loop, you're
> in trouble pretty quickly.

## The blind Ralph critique, and what it is actually aimed at

Mistele's opening is that the industry is running loops wrong, and his term for
wrong is the blind Ralph loop: a prompt piped to a coding agent with no
measurement, producing "40,000 line PRs that just nobody wants to read." He
argues the shape works for greenfield solo work and fails for teams with
customers, regulatory obligations, and SLAs.

He is careful about the target, and this is the part write-ups of the talk drop:

> And this isn't to throw shade at [Geoffrey] Huntley. Ralph is an innovative,
> it's a sharp tool that works very well for certain types of problems.

and later:

> Which is not to say that all Ralph loops are blind loops. The best Ralphs are
> actually applying control theory. I know [Geoffrey] Huntley is out in the hall
> somewhere wandering around. If you go talk to him, he's going to tell you the
> same thing, that Ralph is a teaching device and I think some of us read it a
> little too literally.

I checked that claim against the original, and Mistele is right. Huntley's
"phase two: backpressure" section already tells you to wire a type checker or a
static analyser into the loop as a rejection gate. The blind Ralph is a reading
of Ralph, not Ralph. The one thing Mistele adds that Huntley genuinely lacks is
increments: "the other issue with Ralph loops, they're not incremental. It's
just a bash loop."

Where the two authors do disagree is on whether any of this matters. Huntley
asks "maintainability by whom? By humans? Why are humans the frame?" Mistele's
entire premise is that a human reads every PR, and he builds the loop to make
the reading cheap. Those are incompatible positions about the point of the
exercise, not two descriptions of the same technique.

## The worked example: an Effect migration behind an AST-grep sensor

HumanLayer is migrating its RPC API to Effect, 150 procedures in total. Mistele
walks the whole loop, and the ordering of his steps is the lesson.

**The sensor is AST-grep, not an agent.** He picks it for three reasons: it is
language-agnostic, which matters in a multilingual monorepo; it is out of band
from the TypeScript config and the ESLint rules; and, in the sharpest line of
the talk about why out of band matters, "if you're a TypeScript developer, you
have watched Claude disable those with inline comments." A sensor the actuator
can silently switch off is not a sensor. He writes one rule that matches
unmigrated procedures, layers on more rules over time with per-path include and
exclude, and expects the rule set to grow.

**The sensor output gets trimmed and sorted before anything reads it.**
AST-grep emits roughly fifty keys per violation; he filters to four and sorts
deterministically. That is not cosmetic. A deterministic ordering is what makes
the next step possible.

**Then he steps outside the loop to stop the bleeding.** Before migrating
anything, he runs a full scan on `main`, sorts the violations, and commits the
result to version control. Every PR then gets checked for whether it added new
unmigrated procedures. His framing of why:

> This is our control loop and our system is undergoing disturbances. In this
> case, all of our teammates shipping Claude's slop. And this is how we make
> sure that they're not undoing our loop's work. This doesn't map directly to a
> part of the control loop, but we can kind of squint at it a little bit and
> call it a disturbance dampener.

I think this is the most transferable idea in the talk and the one with the
lowest cost. A committed baseline plus a PR check is a day of work, it needs no
agent at all, and it converts an unbounded problem into a bounded one before you
spend a token. You can build the dampener and never build the loop.

**The controller is deterministic by preference.** His options, in his order of
preference: pick the first violation with `bash` and `jq`; use AST-grep to find
and always pick the smallest unmigrated procedure, to reduce per-change risk; or
let an agent decide. On the third: "I don't think you should ever send an agent
to do deterministic code's job, but you certainly can."

The clever version is the one worth stealing. Because the migration exists to
improve error handling and instrumentation, the controller can read telemetry
and pick the procedures with the most errors, the least instrumentation, or a
gap in the APM, then pass that telemetry through to the actuator in the control
signal:

> When we send a control signal to our actuator agent, we can include not just
> the procedure to migrate, but also all the data about the things that we're
> trying to fix with this migration so that the actuator agent can actually make
> the code better instead of just doing a one-to-one migration.

**The actuator is an agent plus a skill, and the skill is where the time goes.**
His advice is to expect to iterate the skill rather than write it up front, and
to hand-write what HumanLayer calls golden patterns before letting the agent
near the task, "because they're just pattern replicators and otherwise you're
getting what's in the docs or what the agent knows from the internet." The skill
carries a response template, and the agent's final message becomes the PR body
through a deterministic commit, push, and PR-create step.

**The runner is your existing CI.** His recommendation is GitHub Actions, GitLab,
or CircleCI, because they already hold the code, the secrets, the scheduling, and
the dispatch primitives. "We don't need a new cluster for this." One workflow
runs one iteration of sense, control, actuate, and opens one PR. Schedule it
daily and "every morning we walk into the office to a small incremental PR that's
low risk."

## The two mechanisms that came from the loop failing

Mistele is unusually honest that the first version did not work, and both fixes
came out of that.

**Re-steering through a versioned feedback file.** The first frustration was
friction: "we had to constantly update the skill, we had to constantly check out
the branch, change the skill, change the code, commit and push." The fix is a
markdown feedback file tracked in version control and loaded deterministically
into the actuator's context on every run, after the controller. Each loop labels
its PRs so a workflow only answers comments on PRs it created, and a `/iterate`
comment on the PR triggers the workflow to load the diff, the comments, the
review comments, and the description into the agent's context, then fix the code
and update the feedback file. His argument for the file over a chat message:

> The benefit of doing this way is that now that feedback file with instructions
> is tracked in your version control, you can see how you've changed it over
> time, you can revert it if you need to.

Two things about this are better than they look. The human correction changes
future runs rather than only the current PR, which is the difference between
steering and nagging. And the correction is a reviewable diff, so a bad
instruction is revertible the same way bad code is.

**Flow control through a one-open-PR bound.** The second frustration was
stacking: "if we were at a customer site for a week, or if we were traveling, or
spent six days working on slides instead of writing code, the PRs from all of our
loops would just stack up. They duplicate work. They'd conflict." The fix is
five lines of workflow, checked before the expensive steps run:

> When the workflow first runs, before we check out the code and install the
> dependencies and run our sense-control-actuate steps, we can just check and see
> if the last PR that we created, or any PR with the loop's label on it, is open.
> And if so, we just shut down. Because this means that the last time that a
> human reviewed the code from this loop was before the loop ran. No human
> reviewed the last output, so there's no reason to stack up even more work for
> humans to review.

This is the answer to Osmani's orchestration tax and to every "I woke up to
forty PRs" complaint. Work in progress is bounded by review capacity, measured
directly, by one API call. It costs nothing and it is the piece I would build
second, after the dampener.

**Parallelism comes last and only after tuning.** His options for speeding up,
once the loop is producing consistent output: have the controller pick three or
five targets instead of one; pick three or five and give each its own
implementation phase, which he argues is "both cheaper and more reliable since
each migration gets its own context window"; or run the workflow four times and
hand one PR to each of four people. Note that the last option scales the loop by
adding reviewers, not by adding agents.

## What the shipped skill actually contains

Mistele closes with "if you want to try this yourself, we built a skill, please
try it out," and does not name it. It is `design-control-loop` in
[humanlayer/skills](https://github.com/humanlayer/skills), added 2026-06-30 in
commit `39fb327`, roughly four weeks before the talk was published. A sibling
skill, `build-iterated-agentic-loop`, ships the same templates without the
interview.

The skill is not a summary of the talk. It is an eight-phase interview that
builds the loop in the user's repo, and it contains three things the talk does
not.

Phase D refuses to write any CI until the sensor, the controller, and the
actuator each run locally and standalone: "Only proceed to CI once each piece
runs locally on its own. This keeps the loop debuggable and makes the workflow a
thin orchestrator of things the user can already run." Phase H makes you validate
the workflow YAML and dry-run it behind a temporary `push` trigger, because "a
workflow cannot be `workflow_dispatch`-ed until it has run once." And the skill
frames the dampener as optional, offered rather than mandated, where the talk
presents it as the thing you do before anything else.

The skill also pushes back on its own templates harder than I expected from a
vendor artifact. Its worked example is labelled "an illustration, not a
blueprint," and the standing instruction is "Tailor every component. The right
sensor, controller, and actuator depend entirely on the user's problem and stack.
The lists in the references are examples to spark discussion, never a checklist
to push." Its `agent-runner-templates.md` carries headless invocations for Claude
Code, Codex, OpenCode, and CodeLayer, so the loop is not bound to one vendor's
agent.

The default it states plainly, and which the talk only implies, is the bound:
"Recommended default: one open PR per loop."
