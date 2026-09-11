---
schemaVersion: 1
id: memory
kind: workflow
title: Memory
description: Open the supermemory store as an interactive graph — start the local proxy if it is not already up, then hand back the URL.
requires:
  tools:
    - bash
  environment:
    - filesystem
    - node
    - pnpm
optional:
  tools:
    - read
  environment:
    - cli:supermemory
---

# Memory

## Purpose

Use this workflow to look at what supermemory has stored, rather than to query it. `firehorse-recall` is the deliberate-recall path and answers a question you can already phrase; this one is for the case where you cannot phrase it yet — you want to see the shape of a project's memory, scan what extraction produced, or find the memory you half-remember.

It is the only Firehorse workflow that leaves something running. Every other command finishes; this one starts a local server and hands back a URL.

## Usage

Invoke the generated command with no arguments. It takes none: the port is `FIREHORSE_GRAPH_PORT` and the store is `SUPERMEMORY_API_URL`, so there is nothing left for a flag to carry.

## Inputs

- `SUPERMEMORY_API_URL`, defaulting to `http://localhost:6767`.
- The API key, from `SUPERMEMORY_API_KEY`, `SUPERMEMORY_CC_API_KEY`, or `~/.supermemory-claude/credentials.json`. All three are optional — the self-hosted server accepts unauthenticated reads.
- `FIREHORSE_GRAPH_PORT`, defaulting to 5187.

## Outputs

- A running server on `http://localhost:5187`, and the URL reported to the user.
- Nothing written. The app reads; it never modifies the store.

## Supporting Capabilities

- Required: `bash`, Node 20+, and the `packages/firehorse-graph` workspace.
- Optional: the `supermemory` CLI, only to start the store when it is not running.
- No upstream skills. This workflow orchestrates a local process, not a conversation.

## Orchestration Intent

Check, build if needed, start, report. There is no judgement in this workflow and nothing to decide — its whole job is to get a URL into the user's hands without making them remember three commands. Do not narrate the steps; report the URL.

## Safety Gates

- **One instance per port.** A healthy `/api/health` means an instance is already up: report its URL and stop.
- **A port that answers anything else belongs to something else.** Say so and stop, rather than binding elsewhere silently.
- **The server runs in the background.** It does not exit, and a workflow that never returns is a hung session.
- **Report a URL you have confirmed answers.**
- **This workflow reads.** The app never modifies the store, and nothing here should suggest it can.

## Gotchas

- An unbuilt app answers `404` with `No built app found. Run pnpm build first.` — a live server and a useless one look the same until you ask.
- A `503` from `/api/health` means supermemory itself is down, not this app. Opening a browser onto it shows an empty graph rather than an error.
- The store is expected at `SUPERMEMORY_API_URL`, and the self-hosted server accepts unauthenticated reads — so a missing API key looks like success.

## Procedure

1. **Start the server.** `pnpm --filter firehorse-graph serve` from the repo root, in the background — it resolves configuration, checks the port, and either reports an instance already running or starts one. It does not exit.
   → Done when: the process is running in the background and has printed its first line.

2. **Read that first line.** `already running on <url>` means an instance was reused and there is nothing to start. `Port … is taken by something that is not firehorse-graph` means stop and tell the user.
   → Done when: you know whether you started an instance, reused one, or must stop.

3. **Build if the app answers `404`.** `pnpm --filter firehorse-graph build`, then start it again.
   → Done when: the server serves the app rather than the no-built-app message. Already built, skip.

4. **Confirm `GET /api/health` returns `ok`.**
   → Done when: the health check passes, or a `503` is reported as supermemory being down rather than opened in a browser.

5. **Open the URL** in the user's browser.
   → Done when: the browser has been pointed at the confirmed URL.

6. **Report the URL and the project count** the health check returned. One line — the user is going to look at the app, not read about it.
   → Done when: both are in one line.

## Projection Notes

This definition creates no execution graph and loads no skills — the whole workflow is three shell commands and a health check.
