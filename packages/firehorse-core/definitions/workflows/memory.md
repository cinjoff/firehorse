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

Use this workflow to look at what supermemory has stored, rather than to query it. `firehorse-recall` is the deliberate-recall path and answers a question you can already phrase (D-144); this one is for the case where you cannot phrase it yet — you want to see the shape of a project's memory, scan what extraction produced, or find the memory you half-remember.

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

- Do not start a second server on a port that is already serving. A healthy `/api/health` on the port means an instance is already up: report its URL and stop.
- Do not talk over a port held by something that is not this app. Anything other than a healthy health check means the port is occupied — say so and stop, rather than binding elsewhere silently.
- Do not run the server in the foreground of the session. It does not exit, and a workflow that never returns is a hung session.
- Do not report a URL you have not confirmed answers.
- Do not write to supermemory from this workflow, or suggest the app can.

## Procedure

1. Run `pnpm --filter firehorse-graph serve` from the repo root. It resolves configuration, checks the port, and either reports an instance already running or starts one. Run it in the background; it does not exit.
2. Read its first line. `already running on <url>` means an instance was reused and there is nothing more to start. `Port … is taken by something that is not firehorse-graph` means stop and tell the user.
3. If the app has never been built, the server answers `404` with `No built app found. Run pnpm build first.` Run `pnpm --filter firehorse-graph build` and start it again.
4. Confirm `GET /api/health` returns `ok`. A `503` means supermemory itself is not running — report that, and that the store is expected at `SUPERMEMORY_API_URL`, rather than opening a browser onto an empty graph.
5. Open the URL in the user's browser.
6. Report the URL and the project count the health check returned. One line. The user is going to look at the app, not read about it.

## Projection Notes

The Claude mirror is a static command generated from this definition. It creates no execution graph and loads no skills — the whole workflow is three shell commands and a health check. Run `pnpm definitions:write` after editing this file; the mirror is never hand-edited.
