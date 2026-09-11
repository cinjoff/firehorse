# Product: firehorse-graph

## What it is

A local app for exploring a self-hosted supermemory store as an interactive graph.
Launched from a Firehorse command, it runs on the user's own machine against
`http://localhost:6767` and never talks to a hosted service.

## Who uses it

One person: the developer whose coding sessions wrote the memories. They are not
a customer, an admin, or an analyst. There is no multi-user story, no permission
model, and no onboarding — they installed the thing that created this data.

## The scene

A second browser window on a developer's desk, opened beside a terminal, usually
while something else is the real task. Sessions are short and investigative. The
ambient light is whatever the editor is in, which is dark.

## What it is for

The store holds memories from every repo the user works in, keyed by container
tag. Three jobs live here, and the user has not yet decided which dominates:

1. **Find** a specific memory they half-remember.
2. **Browse** what a project knows — its shape, volume, and gaps.
3. **Audit** whether extraction is producing memories worth keeping.

Asked which comes first, the user said they do not know. So the shell gives all
three equal standing and buries none, and the answer gets revised from use rather
than guessed now.

## Product truth

- **A project is a container tag.** Its name is parsed from the tag itself
  (`repo_<name>__<hash>`), not looked up.
- **The graph is sparse today.** `memoryRelations` is empty on every entry in the
  store, so there are no memory-to-memory edges. The picture is documents and the
  memories hanging off them. Designing as though a rich web exists would be a lie.
- **Two projects exist right now**, with 8 and 1 documents. The app must not look
  broken at this size, and must not fall over at a hundred times it.
- **Everything is read-only.** Nothing in this app writes to supermemory.

## Non-goals

- Replacing the `firehorse-recall` CLI, which is how agents query memory.
- Editing, deleting, or curating memories.
- Working against hosted supermemory as the primary target.
