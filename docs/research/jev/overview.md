# What Jev is

Jev is a decision model from TypeSafe AI. You give it state and a typed question,
and it returns a typed answer with a probability. It cannot write text, so it
cannot be used to draft, explain, or converse.

TypeSafe came out of stealth on 2026-09-15 with a $40M seed led by DCVC. The CEO
is Diogo Almeida, previously an OpenAI researcher on the instruction-following
work behind InstructGPT. The company calls the category "System One models",
after Kahneman's fast, automatic System 1.

## The three primitives

Every request is state plus a map of questions. Each question is one of:

| Primitive | Returns | Use it for |
|---|---|---|
| `Choice` | one option from a set you define, plus a probability for every option | picking a route, a tool, a label, a next action |
| `Score` | a position on an ordered rubric of 2 to 10 levels you define | severity, risk, relevance, confidence in a claim |
| `Noul` | a probability that a condition is true | a yes/no gate |

`Choice` and `Score` also return a `confidence` field, which TypeSafe documents as
distinct from the answer probability. `Noul` has no separate confidence field:
the probability is the answer.

A `Choice` accepts up to 255 options. Criteria are a map of option to rubric
description, so the option set and its meaning travel together.

## The shape of a call

```
POST https://api.typesafe.ai/v1/systemone
```

```json
{
  "state": "Help! My payouts have been failing for 3 days.",
  "model": "jev-latest",
  "questions": {
    "department": {
      "type": "choice",
      "instructions": "Which team should handle this?",
      "criteria": {
        "billing": "Payments, invoicing, refunds",
        "technical": "Bugs, outages, integrations",
        "sales": "Pricing, upgrades, new accounts"
      }
    }
  }
}
```

```json
{
  "model": "jev-1.13.0",
  "answers": {
    "department": {
      "type": "choice",
      "choice": "billing",
      "probabilities": { "billing": 0.88, "technical": 0.12, "sales": 0.0 },
      "confidence": 0.81
    }
  }
}
```

Questions in a single request are answered in parallel and share the state, so
asking six questions about one piece of state costs one round trip. The
classifier in this directory uses that: six questions per repository, one call.

## Reference facts

Current as of 2026-09-20. Everything here moves, so re-check before relying on it.

| Item | Value |
|---|---|
| Endpoint | `POST https://api.typesafe.ai/v1/systemone` |
| Current version | `jev-1.13.0` |
| Aliases | `jev-latest`, `jev-preview`, both of which move |
| Price | $0.042 per million input tokens, output free |
| Rate limits | 250,000 tokens/second, 1,200 requests/minute, described as dynamic |
| Context | 64k tokens per request, 32k for state plus the longest question |
| State input | a string, a JSON object, or an array of text values |
| Language | English is primary; test non-English on representative data |

TypeSafe's own guidance is to pin a versioned model ID whenever your thresholds
depend on model behaviour, and to log the version returned in each response. The
classifier here pins `jev-1.13.0` for that reason.

Third-party access exists through Vercel AI Gateway (`typesafe-ai/jev`, via the
AI SDK's experimental `evaluate` interface), Cloudflare Workers AI
(`typesafe/jev`), and OpenRouter (`typesafe/jev-1.13`).

## What it is bad at

TypeSafe publishes a [jaggedness page](https://docs.typesafe.ai/model-jaggedness/jev-1.13)
for each version, which is more candid than the launch post. For `jev-1.13`,
last reviewed 2026-09-17, the documented failure modes are:

1. **Literal reading.** It answers the question you wrote, not the one you meant.
   Scoping words, negations, and implied conditions are read at face value.
2. **Math and numbers.** It is not a calculator and does not count reliably.
   Error grows with the size of the thing being counted.
3. **Date and time comparison.** Extract components and compare in code.
4. **Indirection.** It degrades when the answer is several hops from the state.
5. **Large state full of irrelevant detail.** Filter before you send.
6. **Adversarial content.** Test edge cases before deploying.
7. **Contradictory instructions and criteria.** Align the two.
8. **Common-sense structural invariants.** Ask each decision one way and enforce
   identities in code.
9. **Generation.** Use a generative model.

The first one is the one that bit this research. See [method.md](method.md).

The line worth keeping from that page:

> When you look at a wrong answer and find yourself explaining what you really
> meant, that explanation is the missing half of the instruction.

## On "cannot hallucinate"

The launch framing is that Jev cannot hallucinate. What is actually true is
narrower: the output is constrained to the schema, so an invalid type or an
out-of-set option is impossible. A wrong but well-typed answer is entirely
possible, and this research produced plenty of them. The distinction matters,
and it was the first thing the Hacker News thread went after. See
[reception.md](reception.md).
