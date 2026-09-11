# Triage Labels

Matt Pocock engineering skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label role        | Label in GitHub   | Meaning                                  |
| ----------------- | ----------------- | ---------------------------------------- |
| `needs-triage`    | `needs-triage`    | Maintainer needs to evaluate this issue  |
| `needs-info`      | `needs-info`      | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent  |
| `ready-for-human` | `ready-for-human` | Requires human implementation            |
| `wontfix`         | `wontfix`         | Will not be actioned                     |

When a skill mentions a role, use the corresponding GitHub label from this table.

## Current repository note

At setup time, `ready-for-agent`, `ready-for-human`, and `wontfix` existed in GitHub. `needs-triage` and `needs-info` were part of the chosen vocabulary but had not yet been observed in the repo labels; create them in GitHub if a workflow needs to apply them.
