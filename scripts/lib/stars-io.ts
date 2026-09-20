// Reads for the upstream scan: the maintainer's GitHub stars and the cheap
// structural facts a repo's tree gives up without a clone.
//
// The ledger lives in ./ledger.ts and the candidate shape in ./candidates.ts.
//
// Everything here is a fact the scan reads. The judgments and the thresholds
// live in `scripts/upstream-scan.ts`, the same split `triage.ts` keeps.
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

import type { RepoShape } from "./candidates.js";
export type { RepoShape };

/** A starred repository, as the scan sees it before Jev reads anything. */
export interface StarredRepo {
  readonly fullName: string;
  readonly description: string;
  readonly language: string;
  readonly topics: readonly string[];
  readonly stars: number;
  readonly pushedAt: string;
  readonly starredAt: string;
  readonly archived: boolean;
  readonly license: string;
}

/**
 * Structural facts read from the repository tree. Cheap because one tree call
 * answers all of them; no clone, no checkout, and it works on repos far too
 * large to pull during a light pass.
 */
async function gh(args: readonly string[]): Promise<string> {
  // 10 MB: a recursive tree on a large repo runs well past execFile's default.
  const { stdout } = await run("gh", [...args], { maxBuffer: 10 * 1024 * 1024 });
  return stdout;
}

/**
 * Every repo the authenticated user has starred, newest star first.
 *
 * The `star+json` media type is what carries `starred_at`; without it GitHub
 * returns the repo alone and the scan has no way to tell a new star from one
 * that has sat there for two years.
 */
export async function starredRepos(): Promise<StarredRepo[]> {
  const stdout = await gh([
    "api",
    "user/starred?per_page=100",
    "--paginate",
    "-H",
    "Accept: application/vnd.github.star+json",
  ]);

  // --paginate concatenates one JSON array per page rather than merging them.
  const pages = stdout.replace(/\]\s*\[/g, ",").trim();
  const raw = JSON.parse(pages) as {
    starred_at: string;
    repo: {
      full_name: string;
      description: string | null;
      language: string | null;
      topics?: string[];
      stargazers_count: number;
      pushed_at: string;
      archived: boolean;
      license: { spdx_id: string } | null;
    };
  }[];

  return raw.map((entry) => ({
    fullName: entry.repo.full_name,
    description: entry.repo.description ?? "",
    language: entry.repo.language ?? "",
    topics: entry.repo.topics ?? [],
    stars: entry.repo.stargazers_count,
    pushedAt: entry.repo.pushed_at,
    starredAt: entry.starred_at,
    archived: entry.repo.archived,
    license: entry.repo.license?.spdx_id ?? "none",
  }));
}

/** Repo metadata for a repo the maintainer has not starred, named by `--repo`. */
export async function repoByName(fullName: string): Promise<StarredRepo> {
  const stdout = await gh(["api", `repos/${fullName}`]);
  const repo = JSON.parse(stdout) as {
    full_name: string;
    description: string | null;
    language: string | null;
    topics?: string[];
    stargazers_count: number;
    pushed_at: string;
    archived: boolean;
    license: { spdx_id: string } | null;
  };
  return {
    fullName: repo.full_name,
    description: repo.description ?? "",
    language: repo.language ?? "",
    topics: repo.topics ?? [],
    stars: repo.stargazers_count,
    pushedAt: repo.pushed_at,
    starredAt: "",
    archived: repo.archived,
    license: repo.license?.spdx_id ?? "none",
  };
}

/**
 * The head of a repo's README. The light pass reads this and nothing else of
 * the contents: a README is the repo's own pitch, which is the right input for
 * deciding whether a deeper read is worth anyone's time, and the wrong input
 * for deciding anything else.
 */
export async function readmeHead(fullName: string, limit = 1500): Promise<string> {
  try {
    const stdout = await gh(["api", `repos/${fullName}/readme`, "--jq", ".content"]);
    return Buffer.from(stdout.trim(), "base64").toString("utf8").slice(0, limit);
  } catch {
    return "";
  }
}

/**
 * Structural shape from one recursive tree call.
 *
 * These are facts, so the scan computes them rather than asking Jev. A skill
 * count and a largest-SKILL.md size answer the evaluation framework's idle
 * footprint line far better than a model's read of a README, and a repo whose
 * tree carries a benchmark directory has usually measured something, which is
 * the first question the intake gate asks.
 */
export async function repoShape(fullName: string): Promise<RepoShape> {
  try {
    const stdout = await gh([
      "api",
      `repos/${fullName}/git/trees/HEAD?recursive=1`,
      "--jq",
      "{truncated: .truncated, entries: [.tree[] | select(.type == \"blob\") | {path: .path, size: .size}]}",
    ]);
    const tree = JSON.parse(stdout) as {
      truncated: boolean;
      entries: { path: string; size: number }[];
    };

    const skills = tree.entries.filter((e) => e.path.endsWith("SKILL.md"));
    const benchmarks = tree.entries
      .map((e) => e.path)
      .filter((p) => /(^|\/)(benchmarks?|evals?|skill-eval[^/]*)\//i.test(p))
      .map((p) => p.split("/").slice(0, -1).join("/"))
      .filter((dir, index, all) => all.indexOf(dir) === index)
      .slice(0, 8);

    return {
      skillCount: skills.length,
      hasPluginManifest: tree.entries.some((e) => e.path.endsWith(".claude-plugin/plugin.json")),
      largestSkillBytes: skills.reduce((max, e) => Math.max(max, e.size), 0),
      benchmarkPaths: benchmarks,
      truncated: tree.truncated,
    };
  } catch {
    return {
      skillCount: 0,
      hasPluginManifest: false,
      largestSkillBytes: 0,
      benchmarkPaths: [],
      truncated: false,
    };
  }
}

/**
 * Repos already filed as candidates, keyed by the `owner/name` in their Source
 * field. The tracker is the authority on what has been filed; the ledger only
 * remembers what fell below the gate and was never filed at all.
 */
export async function filedCandidates(): Promise<Map<string, number>> {
  const stdout = await gh([
    "issue",
    "list",
    "--label",
    "candidate",
    "--state",
    "all",
    "--limit",
    "200",
    "--json",
    "number,body",
  ]);
  const issues = JSON.parse(stdout) as { number: number; body: string }[];
  const filed = new Map<string, number>();
  for (const issue of issues) {
    const match = /github\.com\/([\w.-]+\/[\w.-]+)/.exec(issue.body ?? "");
    if (match) filed.set(match[1]!.replace(/\.git$/, "").toLowerCase(), issue.number);
  }
  return filed;
}

export function repoRoot(): string {
  return process.cwd();
}
