#!/usr/bin/env python3
"""Backtest a Claude Code skill roster against real session history using Jev.

Three stages, each writing JSON into the output directory so a later stage can
be rerun without repeating the one before it:

  units      read session transcripts, emit one record per real user prompt
  backtest   two TypeSafe requests per prompt (rank the roster, rerank the top 3)
  adjudicate one request per prompt, judging the turn against what the agent did
  prune      one request per roster entry, classifying it for removal
  report     print the aggregate, no API calls

Requires TYPESAFE_API_KEY. Everything else is stdlib.
"""
from __future__ import annotations
import argparse, collections, glob, json, os, re, statistics, sys, time
import urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

API = "https://api.typesafe.ai/v1/systemone"
MODEL = os.environ.get("TYPESAFE_MODEL", "jev-latest")
WORKERS = int(os.environ.get("AUDIT_WORKERS", "6"))
SHORTLIST, EXCERPT = 3, 700
# Calibrate on your own data with `report --sweep`; these came from a 28-prompt run.
GATE_T, FITS_T = 0.45, 0.35
PROJECTS = os.path.expanduser("~/.claude/projects")


def ask(state, questions):
    body = json.dumps({"state": state, "model": MODEL, "questions": questions}).encode()
    key = os.environ.get("TYPESAFE_API_KEY")
    if not key:
        sys.exit("TYPESAFE_API_KEY is not set. This skill needs it; nothing else here works without it.")
    req = urllib.request.Request(API, data=body,
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    started = time.perf_counter()
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                out = json.load(r)
                out["_seconds"] = round(time.perf_counter() - started, 2)
                return out
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(1.5 * (attempt + 1)); continue
            return {"error": e.code, "body": e.read().decode()[:300]}
        except Exception as e:  # noqa: BLE001 - network shapes vary
            if attempt < 3:
                time.sleep(1.5); continue
            return {"error": str(e)}


def text_of(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(text_of(x) for x in content)
    if isinstance(content, dict) and content.get("type") == "text":
        return content.get("text", "")
    return ""


def walk_strings(obj, out):
    if isinstance(obj, str):
        out.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            walk_strings(v, out)
    elif isinstance(obj, list):
        for v in obj:
            walk_strings(v, out)


# --------------------------------------------------------------------------- units

def recent_sessions(limit, min_prompts=5):
    rows = []
    for path in glob.glob(os.path.join(PROJECTS, "*", "*.jsonl")):
        last = prompts = 0
        last_ts = None
        try:
            for line in open(path, encoding="utf-8", errors="ignore"):
                if '"timestamp"' not in line:
                    continue
                d = json.loads(line)
                last_ts = d.get("timestamp") or last_ts
                if d.get("type") == "user" and not d.get("isSidechain"):
                    prompts += 1
        except Exception:  # noqa: BLE001 - a half-written transcript is not fatal
            continue
        if last_ts and prompts >= min_prompts:
            rows.append((last_ts, prompts, path))
    rows.sort(reverse=True)
    return rows[:limit]


def build_units(paths):
    units = []
    for path in paths:
        sid = os.path.basename(path)[:8]
        current = None
        for line in open(path, encoding="utf-8", errors="ignore"):
            try:
                d = json.loads(line)
            except Exception:  # noqa: BLE001
                continue
            if d.get("isSidechain"):
                continue
            msg = d.get("message") or {}
            if d.get("type") == "user":
                txt = text_of(msg.get("content"))
                if not txt.strip() or "teammate-message" in txt:
                    continue
                slash = re.findall(r"<command-name>([^<]+)</command-name>", txt)
                args = re.findall(r"<command-args>(.*?)</command-args>", txt, re.S)
                if slash:
                    user_text, typed = (args[0].strip() if args else ""), slash[0].strip()
                elif txt.lstrip().startswith("Base directory for this skill"):
                    continue  # a skill's own body, injected after it loaded
                else:
                    if txt.lstrip().startswith("<") and "pasted_content" not in txt:
                        continue
                    user_text, typed = re.sub(r"<[^>]+>", "", txt).strip(), None
                if len(user_text) < 8 or user_text.startswith(("# ", "/compact", "A session-scoped")):
                    continue
                current = {"session": sid, "request": " ".join(user_text.split())[:1200],
                           "typed_slash_command": typed, "skills_loaded_after": [],
                           "tools_after": collections.Counter()}
                units.append(current)
            elif d.get("type") == "assistant" and current is not None:
                for block in msg.get("content") or []:
                    if isinstance(block, dict) and block.get("type") == "tool_use":
                        name = block.get("name", "?")
                        current["tools_after"][name] += 1
                        if name == "Skill":
                            current["skills_loaded_after"].append((block.get("input") or {}).get("skill"))
    # drop post-compact replays of the same prompt, merging their activity forward
    merged, seen = [], {}
    for u in units:
        key = (u["session"], u["request"][:120])
        if key in seen:
            first = seen[key]
            first["skills_loaded_after"] += u["skills_loaded_after"]
            for k, v in u["tools_after"].items():
                first["tools_after"][k] += v
            continue
        seen[key] = u
        merged.append(u)
    for i, u in enumerate(merged):
        u["index"] = i
        u["tools_after"] = dict(u["tools_after"])
        u["tool_calls_after"] = sum(u["tools_after"].values())
        u["actually_loaded"] = (u["skills_loaded_after"][0] if u["skills_loaded_after"]
                                else (u["typed_slash_command"].lstrip("/") if u["typed_slash_command"] else None))
    return merged


def build_roster(paths):
    """Read the roster out of a transcript's own system reminder, so it is the
    list the agent actually had, not what is installed today."""
    listing = None
    for path in paths:
        for line in open(path, encoding="utf-8", errors="ignore"):
            if "available for use with the Skill tool" not in line:
                continue
            chunks = []
            walk_strings(json.loads(line), chunks)
            for c in chunks:
                if "available for use with the Skill tool" in c:
                    listing = c
            break
        if listing:
            break
    if not listing:
        sys.exit("No skill roster found in those transcripts.")
    bodies = {}
    for f in (glob.glob(os.path.expanduser("~/.claude/plugins/cache/**/SKILL.md"), recursive=True)
              + glob.glob(os.path.expanduser("~/.claude/skills/**/SKILL.md"), recursive=True)):
        slug = os.path.basename(os.path.dirname(f))
        if slug in bodies:
            continue
        try:
            raw = open(f, encoding="utf-8", errors="ignore").read()
            bodies[slug] = " ".join(re.sub(r"^---.*?---", "", raw, flags=re.S).split())[:1200]
        except Exception:  # noqa: BLE001
            pass
    roster = []
    for entry in re.split(r"\n- ", listing.split("available for use with the Skill tool")[1])[1:]:
        m = re.match(r"([a-zA-Z0-9_:\-]+):?\s*(.*)", entry, re.S)
        if not m:
            continue
        name = m.group(1).rstrip(":")
        desc = " ".join(m.group(2).split()).split("While bypass permissions")[0][:600]
        roster.append({"name": name, "description": (desc or name)[:120],
                       "description_full": desc or name, "body": bodies.get(name.split(":")[-1], "")})
    mcp = sorted({m for line in open(paths[0], encoding="utf-8", errors="ignore")
                  for m in re.findall(r"\bmcp__[a-zA-Z0-9_\-]+", line)})
    for server in sorted({m.split("__")[1] for m in mcp if m.count("__") >= 2}):
        tools = [m.split("__", 2)[2] for m in mcp if m.startswith(f"mcp__{server}__")]
        d = f"MCP server '{server}'. Tools: {', '.join(sorted(tools)[:12])}."
        roster.append({"name": "mcp:" + server, "description": d[:120], "description_full": d, "body": ""})
    return roster


# ----------------------------------------------------------------------- backtest

CHOICE_I = ("Which of these skills or MCP tool servers, if any, should the coding agent load before "
            "starting the user's latest request in `request`? Read what each one does.")
RERANK_I = ("Exactly one of these skills is the right one to load for the user's latest request in "
            "`request`. Which one? Read what each actually does, not just its name.")
# A coding agent acts on files every turn, so "is this an action" separates nothing.
# These four separate a turn that wants a documented procedure from one that does not.
GATE = {
 "starts_new_procedural_work": "Does `request` start a new piece of work that has a defined procedure — research, shipping, reviewing, indexing, planning, publishing — rather than continuing a step the agent is already mid-way through?",
 "documented_workflow_exists": "Would a careful expert doing this consult a specific documented workflow or set of commands, rather than working it out from general understanding of the repo?",
 "conversational_turn": "Is `request` a short reply, approval, redirection or status question inside work already underway, such as confirming a plan, saying yes, or asking what is left?",
 "prose_suffices": "Could a knowledgeable generalist fully satisfy `request` in prose, with no tools and no access to the user's files or accounts?",
}
INVERTED = {"prose_suffices", "conversational_turn"}


def suggest(unit, prev, loaded, roster, by_name, project):
    """The hook-shaped function: at most one skill name for a prompt, or None."""
    state = {"request": unit["request"], "recent_context": prev or "",
             "skills_already_loaded_this_session": loaded or [], "project": project}
    q = {"which": {"type": "choice", "instructions": CHOICE_I,
                   "criteria": {s["name"]: s["description"] for s in roster}}}
    for k, t in GATE.items():
        q["gate::" + k] = {"type": "noul", "instructions": t}
    r = ask(state, q)
    if "error" in r:
        return {**unit, "error": r}
    a = r["answers"]
    ranked = sorted(a["which"]["probabilities"].items(), key=lambda kv: -kv[1])
    vals = {k.replace("gate::", ""): v["noul"] for k, v in a.items() if k.startswith("gate::")}
    gate = sum((1 - v) if k in INVERTED else v for k, v in vals.items()) / len(vals)
    out = {**unit, "gate": round(gate, 3), "gate_values": {k: round(v, 2) for k, v in vals.items()},
           "wide_top": [(n, round(p, 3)) for n, p in ranked[:5]],
           "latency_s": r["_seconds"], "tokens": r["usage"]["input_tokens"] + r["usage"]["output_tokens"]}
    if gate < GATE_T:
        return {**out, "suggestion": None, "reason": "gate_below_threshold"}
    names = tuple(n for n, _ in ranked[:SHORTLIST])
    q2 = {"which": {"type": "choice", "instructions": RERANK_I,
          "criteria": {n: (by_name[n]["description_full"] + " — " + by_name[n]["body"][:EXCERPT])[:1800] for n in names}}}
    for n in names:
        q2["fits::" + n] = {"type": "noul", "instructions":
            f"Does the skill '{n}' do the specific thing `request` asks for? It is described as: {by_name[n]['description_full'][:400]}"}
    r2 = ask(state, q2)
    if "error" in r2:
        return {**out, "error": r2}
    a2 = r2["answers"]
    fits = {k.replace("fits::", ""): v["noul"] for k, v in a2.items() if k.startswith("fits::")}
    winner = a2["which"]["choice"]
    out.update(shortlist=list(names), fits={k: round(v, 2) for k, v in fits.items()},
               rerank_winner=winner, rerank_confidence=round(a2["which"]["confidence"], 2),
               latency_s=round(out["latency_s"] + r2["_seconds"], 2),
               tokens=out["tokens"] + r2["usage"]["input_tokens"] + r2["usage"]["output_tokens"])
    ok = fits.get(winner, 0) >= FITS_T
    out.update(suggestion=(winner if ok else None),
               reason="suggested" if ok else f"winner_fits_below_{FITS_T}")
    return out


# --------------------------------------------------------------------- adjudicate

def adjudicate(record, by_name, profile):
    cands = {n: by_name[n]["description_full"][:300] for n in record.get("shortlist", [])}
    act = record["actually_loaded"]
    if act and act in by_name:
        cands[act] = by_name[act]["description_full"][:300]
    state = {"request": record["request"],
             "what_the_agent_then_did": {"skill_loaded": act or "none",
                                         "tool_calls_made": record["tools_after"],
                                         "total_tool_calls": record["tool_calls_after"]},
             "candidate_skills": cands, "user_work_profile": profile}
    q = {
     "right_call": {"type": "choice",
       "instructions": "Looking at `request` and at `what_the_agent_then_did`, what should have happened on this turn? The options name skills from `candidate_skills`.",
       "criteria": {
        "load_a_candidate_skill": "One of the skills in `candidate_skills` encodes the procedure this turn needed, and loading it would have changed how the work was done.",
        "what_happened_was_right": "The agent handled this turn appropriately with the skill it loaded, or correctly loaded nothing.",
        "no_skill_covers_this": "This turn needed a documented procedure, but nothing in `candidate_skills` covers it; the roster has a gap.",
        "turn_needed_no_procedure": "This was conversation, approval or redirection; no skill applies and none should have loaded."}},
     "reinvented_a_procedure": {"type": "noul",
       "instructions": "Judging by `tool_calls_made`, did the agent work out a multi-step procedure from scratch in raw shell commands that a documented skill or MCP server already encodes?",
       "criteria": {"true": "A long run of shell calls reconstructed something an available capability does directly.",
                    "false": "The tool calls were ordinary file, git and CLI work that no capability shortcuts, or there were few calls."}},
     "recurring_shape": {"type": "score",
       "instructions": {"question": "Given `user_work_profile`, how often does a request shaped like `request` recur in this user's work?",
                        "note": "Judge the shape of the task, not its specific subject."},
       "criteria": ["One-off: this exact shape is unlikely to come back.",
                    "Occasional: it recurs every few weeks.",
                    "Regular: it comes back most weeks and follows the same steps each time.",
                    "Constant: it happens several times in a single working session."]},
     "worth_a_new_skill": {"type": "noul",
       "instructions": "Would this user be better off with a written skill for the shape of work in `request`, assuming nothing in `candidate_skills` already covers it?",
       "criteria": {"true": "The steps are repeatable and the agent visibly improvised them.",
                    "false": "The work is too varied to write down, or an existing capability already covers it."}},
    }
    r = ask(state, q)
    if "error" in r:
        return {"index": record["index"], "error": r}
    a = r["answers"]
    return {"index": record["index"], "session": record["session"], "request": record["request"][:140],
            "suggestion": record.get("suggestion"), "rerank_winner": record.get("rerank_winner"),
            "winner_fits": record.get("fits", {}).get(record.get("rerank_winner")),
            "actually_loaded": act, "tool_calls": record["tool_calls_after"],
            "right_call": a["right_call"]["choice"], "right_call_conf": round(a["right_call"]["confidence"], 2),
            "reinvented": round(a["reinvented_a_procedure"]["noul"], 2),
            "recurring": round(a["recurring_shape"]["score"], 2),
            "worth_new_skill": round(a["worth_a_new_skill"]["noul"], 2)}


# -------------------------------------------------------------------------- prune

def classify_entry(entry, shortlisted, loaded, profile, siblings):
    state = {"skill": {"name": entry["name"], "description": entry["description_full"][:500],
                       "instructions_excerpt": entry["body"][:500]},
             "entries_with_the_same_name": siblings,
             "measured_usage": {"times_shortlisted": shortlisted, "ever_loaded": loaded},
             "user_profile": profile}
    # Two literal questions rather than one compound choice: asking "remove, or scope
    # elsewhere, or redundant" in one Choice collapses onto "remove" and the middle
    # options never fire.
    q = {
     "work_occurs_in_these_projects": {"type": "noul",
       "instructions": "Does the specific work that `skill` is built for actually occur in the projects described in `user_profile`?",
       "criteria": {"true": "This user's repositories and workflow contain this kind of task.",
                    "false": "It targets a stack, platform or document format this user's described work does not involve."}},
     "useful_in_a_different_repo": {"type": "noul",
       "instructions": "Is `skill` the right tool for work this developer plausibly does in some repository other than the ones described, so that it should load there rather than be uninstalled?",
       "criteria": {"true": "It targets a real stack or task this developer would credibly take on elsewhere.",
                    "false": "It targets something outside anything this developer does."}},
     "uninstall_entirely": {"type": "noul",
       "instructions": "Should `skill` be uninstalled from this developer's machine altogether, not merely scoped to another project?",
       "criteria": {"true": "Nothing in their work, present or plausible, calls for it.",
                    "false": "There is a realistic situation where they would want it available."}},
     "loss_if_removed": {"type": "score",
       "instructions": "If `skill` were removed from the roster entirely, how much would this user lose?",
       "criteria": ["Nothing: the work never comes up, or a general tool covers it just as well.",
                    "Little: the agent would improvise an acceptable substitute in the rare case it came up.",
                    "Noticeable: when the case arises the agent would do the job worse or slower without it.",
                    "Serious: it encodes a procedure with real failure modes that the agent would get wrong on its own."]},
    }
    r = ask(state, q)
    if "error" in r:
        return {"name": entry["name"], "error": r}
    a = r["answers"]
    return {"name": entry["name"], "shortlisted": shortlisted, "loaded": loaded,
            "fits": round(a["work_occurs_in_these_projects"]["noul"], 2),
            "other_repo": round(a["useful_in_a_different_repo"]["noul"], 2),
            "uninstall": round(a["uninstall_entirely"]["noul"], 2),
            "loss": round(a["loss_if_removed"]["score"], 2)}


# ------------------------------------------------------------------------- report

def report(out_dir, sweep=False):
    load = lambda n: json.load(open(os.path.join(out_dir, n)))  # noqa: E731
    back = load("backtest.json")
    adj = load("adjudicated.json") if os.path.exists(os.path.join(out_dir, "adjudicated.json")) else []
    print(f"{len(back)} prompts replayed")
    if adj:
        counts = collections.Counter(a.get("right_call") for a in adj)
        print("verdicts:", dict(counts))
        misses = [a for a in adj if a.get("right_call") == "load_a_candidate_skill" and a.get("right_call_conf", 0) >= 0.55]
        print(f"\nconfident misses ({len(misses)}):")
        for a in sorted(misses, key=lambda x: -x["right_call_conf"]):
            print(f"  conf={a['right_call_conf']:.2f} reinvented={a['reinvented']:.2f} calls={a['tool_calls']:3d} "
                  f"-> {a['rerank_winner']} (fits {a['winner_fits']})\n     {a['request'][:100]}")
        print(f"\nmean worth_a_new_skill {statistics.mean(a['worth_new_skill'] for a in adj):.2f}"
              f" | mean recurrence {statistics.mean(a['recurring'] for a in adj):.2f} of 3")
    shortlisted = collections.Counter(n for b in back for n in b.get("shortlist", []))
    print(f"\n{len(shortlisted)} roster entries ever shortlisted")
    for n, k in shortlisted.most_common(15):
        print(f"   {k:2d}x {n}")
    lat = sorted(b["latency_s"] for b in back if "latency_s" in b)
    tok = [b["tokens"] for b in back if "tokens" in b]
    if lat:
        print(f"\nper-prompt cost: median {lat[len(lat)//2]}s, p90 {lat[int(len(lat)*0.9)]}s, "
              f"mean {int(sum(tok)/len(tok))} tokens")
    if sweep:
        print("\nthreshold sweep (correct_suggest / wrong / missed / extra / correct_silence):")
        for g in (0.30, 0.40, 0.45, 0.50, 0.60):
            for f in (0.25, 0.30, 0.35, 0.40, 0.50):
                tp = wrong = miss = extra = silent = 0
                for b in back:
                    act, w, fits = b["actually_loaded"], b.get("rerank_winner"), b.get("fits", {})
                    s = w if (b["gate"] >= g and w and fits.get(w, 0) >= f) else None
                    if act and s == act: tp += 1
                    elif act and s: wrong += 1
                    elif act: miss += 1
                    elif s: extra += 1
                    else: silent += 1
                print(f"  gate>={g:.2f} fits>={f:.2f}  {tp} / {wrong} / {miss} / {extra} / {silent}")


# ---------------------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("stage", choices=["sessions", "units", "backtest", "adjudicate", "prune", "report", "all"])
    ap.add_argument("--out", default=".firehorse/skill-audit")
    ap.add_argument("--limit", type=int, default=5, help="how many recent sessions to read")
    ap.add_argument("--profile", default="", help="one paragraph describing the developer's repos and recurring work")
    ap.add_argument("--sweep", action="store_true", help="report: print the threshold sweep")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    p = lambda n: os.path.join(args.out, n)  # noqa: E731

    if args.stage == "sessions":
        for ts, n, path in recent_sessions(args.limit):
            print(f"{ts[:19]}  {n:4d} prompts  {path}")
        return
    if args.stage == "report":
        return report(args.out, args.sweep)

    profile = args.profile or "A software developer. Describe the repos and recurring work with --profile for sharper answers."
    if args.stage in ("units", "all"):
        paths = [r[2] for r in recent_sessions(args.limit)]
        units, roster = build_units(paths), build_roster(paths)
        json.dump(units, open(p("units.json"), "w"), indent=1)
        json.dump(roster, open(p("roster.json"), "w"), indent=1)
        print(f"{len(units)} prompts from {len(paths)} sessions; roster of {len(roster)} entries")
        if args.stage == "units":
            return

    units = json.load(open(p("units.json")))
    roster = json.load(open(p("roster.json")))
    by_name = {s["name"]: s for s in roster}

    if args.stage in ("backtest", "all"):
        jobs, prev, loaded = [], {}, {}
        for u in units:
            jobs.append((u, prev.get(u["session"]), list(loaded.get(u["session"], []))))
            prev[u["session"]] = u["request"][:300]
            if u["actually_loaded"]:
                loaded.setdefault(u["session"], []).append(u["actually_loaded"])
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            back = list(ex.map(lambda j: suggest(j[0], j[1], j[2], roster, by_name, profile), jobs))
        json.dump(back, open(p("backtest.json"), "w"), indent=1)
        print(f"backtest: {len(back)} prompts, {sum(1 for b in back if 'error' in b)} errors")

    if args.stage in ("adjudicate", "all"):
        back = json.load(open(p("backtest.json")))
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            adj = list(ex.map(lambda b: adjudicate(b, by_name, profile), back))
        json.dump(adj, open(p("adjudicated.json"), "w"), indent=1)
        print(f"adjudicated: {len(adj)} turns")

    if args.stage in ("prune", "all"):
        back = json.load(open(p("backtest.json")))
        shortlisted = collections.Counter(n for b in back for n in b.get("shortlist", []))
        ever_loaded = {u["actually_loaded"] for u in units if u["actually_loaded"]}
        by_slug = collections.defaultdict(list)
        for s in roster:
            by_slug[s["name"].split(":")[-1]].append(s["name"])
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            pruned = list(ex.map(lambda s: classify_entry(
                s, shortlisted.get(s["name"], 0), s["name"] in ever_loaded, profile,
                [x for x in by_slug[s["name"].split(":")[-1]] if x != s["name"]]), roster))
        json.dump(pruned, open(p("pruned.json"), "w"), indent=1)
        drop = [x for x in pruned if x.get("fits", 1) < 0.3 and x.get("loss", 3) < 1.0]
        print(f"pruned: {len(pruned)} entries; {len(drop)} score low on both fit and loss")
        for x in sorted(drop, key=lambda d: d["loss"])[:25]:
            print(f"   fit={x['fits']:.2f} loss={x['loss']:.2f} uninstall={x['uninstall']:.2f} {x['name']}")

    if args.stage == "all":
        print()
        report(args.out)


if __name__ == "__main__":
    main()
