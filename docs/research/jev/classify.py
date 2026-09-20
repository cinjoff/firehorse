#!/usr/bin/env python3
"""Classify Jev implementations using Jev itself.

Reads data/implementations.json, sends each un-classified (or --force) entry to
TypeSafe's System One endpoint, and writes the typed answers back in place.

The point of classifying Jev projects with Jev is not novelty: the taxonomy has
~10 overlapping categories and 300+ entries, which is exactly the "pick one of N
from unstructured state" shape the model exists for. Every answer carries a
probability, so low-confidence rows get flagged for human review instead of
being silently wrong.

Usage:
    TYPESAFE_API_KEY=... python3 docs/research/jev/classify.py [--force] [--limit N]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ENDPOINT = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-1.13.0"  # pinned: thresholds below depend on calibration
DATA = Path(__file__).parent / "data" / "implementations.json"

# Confidence floor. Below this, the row is marked needs_review rather than
# trusted. TypeSafe documents Choice/Score confidence as distinct from answer
# probability; see docs.typesafe.ai/confidence.
REVIEW_FLOOR = 0.55

CATEGORIES = {
    "agent-guardrail": "Verifies, gates, risk-scores or blocks an agent's tool call, action, or completion claim",
    "agent-routing": "Selects which model, agent, subagent or tool should handle a turn or task",
    "context-engineering": "Decides what enters, stays in, or is pruned from a model's context window",
    "browser-computer-use": "Drives a real browser, desktop, or mobile device from observed state",
    "data-retrieval": "Judgments over database rows, documents, datasets, search results or retrieval ranking",
    "dev-tooling": "An SDK, client library, CLI, MCP server, or editor plugin for calling the model",
    "open-reproduction": "An open-weight, local, or self-hosted reimplementation of the System One interface",
    "evaluation": "Benchmarks, evals, calibration studies, or failure analyses that measure how the model behaves",
    "games-robotics": "A game-playing agent, simulation, or robotic/vehicle control loop",
    "media-creative": "Media, content, music, or creative tooling",
    "domain-app": "An end-user application in a specific vertical such as finance, health, legal, or social",
    "not-jev": "Not part of the Jev ecosystem at all: an unrelated project, a general awesome-list, or a tool that merely appears alongside one",
}

JEV_ROLES = {
    "gate": "Jev approves, denies, or escalates an action the surrounding code was already going to take",
    "select": "Jev picks one option from a set of candidates the code enumerated",
    "rank": "Jev scores or orders a list of items",
    "label": "Jev classifies or tags input without driving a branch",
    "none": "Jev is not actually called; the project is adjacent, a list, or unrelated",
}

READINESS = [
    "Toy, joke, or a single screenshot-level demo",
    "Working experiment or proof of concept, little documentation",
    "Usable library or tool with real documentation and a clear interface",
    "Production-oriented: tests, CI, error handling, and explicit failure modes",
]


def questions() -> dict:
    return {
        "category": {
            "type": "choice",
            "instructions": "Which single category best describes this project's primary function?",
            "criteria": CATEGORIES,
        },
        "jev_role": {
            "type": "choice",
            "instructions": "What job does the Jev model itself do inside this project?",
            "criteria": JEV_ROLES,
        },
        "agentic_dev": {
            "type": "noul",
            "instructions": "Is this project aimed at agentic software development workflows "
            "specifically: coding agents, code review, commits, CI, or developer tooling?",
        },
        "readiness": {
            "type": "score",
            "instructions": "How finished and dependable does this project appear?",
            "criteria": READINESS,
        },
        "code_owns_control": {
            "type": "noul",
            "instructions": "Does deterministic application code retain control of what actually "
            "executes, with the model only answering a bounded question at a branch point?",
        },
    }


def state_for(key: str, rec: dict) -> dict:
    return {
        "repository": key,
        "name": rec.get("name") or key.split("/")[-1],
        "curated_description": rec.get("desc") or "",
        "github_description": rec.get("gh_desc") or "",
        "primary_language": rec.get("lang") or "unknown",
        "stars": rec.get("stars"),
        "appears_in_community_lists": rec.get("list_count"),
    }


def ask(key: str, rec: dict, retries: int = 4) -> tuple[str, dict | None, str | None]:
    body = json.dumps(
        {"state": state_for(key, rec), "model": MODEL, "questions": questions()}
    ).encode()
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={
            "Authorization": f"Bearer {os.environ['TYPESAFE_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                return key, json.loads(resp.read()), None
        except urllib.error.HTTPError as exc:
            if exc.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(2**attempt)
                continue
            return key, None, f"HTTP {exc.code}: {exc.read()[:200].decode(errors='replace')}"
        except Exception as exc:  # noqa: BLE001 - network shapes vary
            if attempt < retries - 1:
                time.sleep(2**attempt)
                continue
            return key, None, str(exc)
    return key, None, "exhausted retries"


def fold(answers: dict) -> dict:
    a = answers["answers"]
    category = a["category"]
    role = a["jev_role"]
    readiness = a["readiness"]
    lowest = min(category["confidence"], role["confidence"], readiness["confidence"])
    return {
        "model": answers["model"],
        "category": category["choice"],
        "category_confidence": round(category["confidence"], 3),
        "jev_role": role["choice"],
        "jev_role_confidence": round(role["confidence"], 3),
        "agentic_dev": round(a["agentic_dev"]["noul"], 3),
        "readiness": readiness["score"],
        "readiness_confidence": round(readiness["confidence"], 3),
        "code_owns_control": round(a["code_owns_control"]["noul"], 3),
        "in_ecosystem": category["choice"] != "not-jev",
        # A project can be listed in the Jev ecosystem yet never call the model
        # ("pairs naturally with ..."). jev_role == "none" catches those. Open
        # reproductions are the deliberate exception: they reimplement the
        # interface instead of calling the hosted model, so "none" is the
        # correct role for them and must not exclude them.
        "verified_integration": category["choice"] != "not-jev"
        and (role["choice"] != "none" or category["choice"] == "open-reproduction"),
        "needs_review": lowest < REVIEW_FLOOR,
        "classified_at": time.strftime("%Y-%m-%d"),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="reclassify rows that already have answers")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    if not os.environ.get("TYPESAFE_API_KEY"):
        print("TYPESAFE_API_KEY is not set", file=sys.stderr)
        return 1

    repos = json.loads(DATA.read_text())
    todo = [k for k, v in repos.items() if args.force or "jev" not in v]
    if args.limit:
        todo = todo[: args.limit]
    print(f"classifying {len(todo)} of {len(repos)} entries with {MODEL}")

    done = failed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for key, result, err in pool.map(lambda k: ask(k, repos[k]), todo):
            if err:
                failed += 1
                print(f"  ! {key}: {err}", file=sys.stderr)
                continue
            repos[key]["jev"] = fold(result)
            done += 1
            if done % 25 == 0:
                print(f"  {done}/{len(todo)}")

    DATA.write_text(json.dumps(repos, indent=1, sort_keys=True) + "\n")
    print(f"done: {done} classified, {failed} failed -> {DATA}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
