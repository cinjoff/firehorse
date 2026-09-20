# Jev for "which skill next", and where it breaks

TypeSafe publishes a cookbook for almost exactly this problem:
[skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion). It picks at most one
skill per agent turn out of the 182 in Nous Research's Hermes catalog. Read 2026-09-20; the
published run used `jev-1.12` and `claude-haiku-4-5-20251001`, rendered 2026-07-31.

It answers "which skill fits this request". Firehorse's question is "what should happen next
given what just finished", which is a different question over a much smaller roster. The
mechanics still transfer, and the cookbook's own numbers set the ceiling.

## The recipe

Two requests, two thresholds, at most one name out.

**Request 1, over the whole roster.** One `Choice` with every skill as an option and its
index description as the criterion, plus three `Noul` gates about the request. All in one
call, answered in parallel:

```python
CHOICE_INSTRUCTIONS = (
    "Which of these skills, if any, is the right one to load to help with the "
    "user's latest request?"
)
GATE_QUESTIONS = {
    "acts_on_user_system": (
        "Is the assistant being asked to act on the user's files, accounts, devices, "
        "or online services, rather than only to explain or advise?"
    ),
    "would_follow_documented_procedure": (
        "Would a careful expert answering this consult a specific documented procedure "
        "or set of commands, rather than answering from general understanding?"
    ),
    "prose_suffices": (
        "Could a knowledgeable generalist fully satisfy this request in prose, with "
        "no tools, no documentation, and no access to the user's files or accounts?"
    ),
}
INVERTED = {"prose_suffices"}   # a yes here points away from needing a skill
```

The three gates are oriented (`1 - v` for the inverted one) and averaged. Under `0.30`,
nothing is suggested at all.

**Request 2, over the top three.** The same `Choice` again, but now each option's criterion
is the full description plus the first 700 characters of its `SKILL.md`, alongside one
absolute `Noul` per candidate: "Does the skill '{name}' do the specific thing the user's
request asks for?" If the best of those is under `0.30`, nothing is suggested.

```python
def suggest(request):
    wide = rank_wide(request)
    if wide["gate"] < GATE_THRESHOLD:        # 0.30
        return ()
    shortlist = tuple(name for name, _ in wide["ranked"][:SHORTLIST])   # 3
    result = rerank(request, shortlist, EXCERPT_CHARS)                  # 700
    if max(result["fits"].values()) < FITS_THRESHOLD:                   # 0.30
        return ()
    return (result["winner"],)
```

The output is one line appended after the roster in the system prompt:

> Relevant to the current request: pptx-author. Ignore this if it does not fit what the user
> actually asked for.

The roster itself never changes, so prefix caching over it still holds.

## The measured result, and the ceiling

Over 488 requests against `claude-haiku-4-5-20251001`:

| | loads the wrong skill | loads one when nothing fits |
|---|---|---|
| agent alone, with just its roster | 16.8% | 9.8% |
| **agent with a TypeSafe suggestion** | **7.3%** | **4.0%** |
| agent handed the right answer | 2.5% | 1.2% |

The third row is the honest part. An agent handed the correct skill still fails to load it
2.5% of the time, so no selection method gets below that floor. The gain here is real and it
is also bounded: the suggestion closes roughly two thirds of the gap between the agent's own
judgment and perfect information.

## Three design notes worth keeping

1. **Write the gates to ask whether an action is wanted, not about subject matter.** The
   cookbook says so directly: a question about subject matter will not separate "explain what
   a monad is" from a request that needs a skill, because both are software.
2. **One `Choice` holds 182 options comfortably** (the limit is 255). Firehorse's roster is
   around a dozen, so the second request earns nothing. One call, the `Choice` plus the
   gates, is the whole thing.
3. **The suggestion block is an input, not prose.** The cookbook's own docstring warns that
   editing a word in it invalidates the measured results. Any wording Firehorse ships becomes
   part of what it would have to re-measure.

## Where Jev is a bad fit for this

TypeSafe publishes a [jaggedness page](https://docs.typesafe.ai/model-jaggedness/jev-1.13)
per version. Four of the nine documented failure modes bite this use case:

- **Indirection.** It degrades when the answer is several hops from the state. "What should
  the user do next" is several hops from a raw transcript: you have to infer what workflow
  was running, how far it got, and what its successor is. Send resolved state, not a
  transcript.
- **Large state full of irrelevant detail.** Filter before you send. This is the same
  constraint Foreman answers with its truncation limits.
- **Literal reading.** "It answers the question you wrote, not the one you meant." The line
  from that page worth keeping: *when you look at a wrong answer and find yourself explaining
  what you really meant, that explanation is the missing half of the instruction.*
- **Date and time comparison.** Extract components and compare in code. Anything in a
  Firehorse recommendation that depends on staleness (index freshness, a ticket's age) is a
  comparison the hook does, not a question Jev answers.

Two more constraints from `docs/research/jev/overview.md`:

- **Pin the version.** `jev-latest` moves. The repo's own classifier pins `jev-1.13.0`
  because thresholds depend on model behavior, and TypeSafe's guidance is to log the version
  returned in each response.
- **"Cannot hallucinate" is narrower than it sounds.** The output is schema-constrained, so
  an out-of-set option is impossible. A wrong but well-typed answer is entirely possible.

## Cost and latency

$0.042 per million input tokens, output free, 70 to 500ms per call. For a hook that fires
once per turn on a small state struct, the bill is not the constraint. The 5 second hook
timeout and the user's patience are.
