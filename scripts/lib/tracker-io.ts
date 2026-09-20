// Every tracker read and write goes through `gh`, as docs/agents/issue-tracker.md
// requires. Nothing here knows what a triage judgment means.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface Issue {
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
  readonly labels: readonly { readonly name: string }[];
}

export interface MapIssue extends Issue {
  readonly children: readonly number[];
}

async function gh(args: readonly string[]): Promise<string> {
  const { stdout } = await run("gh", [...args], { maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}

export async function repoSlug(): Promise<string> {
  return (await gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"])).trim();
}

export async function openIssues(): Promise<Issue[]> {
  const stdout = await gh([
    "issue",
    "list",
    "--state",
    "open",
    "--limit",
    "500",
    "--json",
    "number,title,body,createdAt,labels",
  ]);
  return JSON.parse(stdout) as Issue[];
}

export async function subIssueNumbers(slug: string, parent: number): Promise<number[]> {
  try {
    const stdout = await gh([
      "api",
      `repos/${slug}/issues/${parent}/sub_issues`,
      "--paginate",
      "--jq",
      ".[].number",
    ]);
    return stdout
      .split("\n")
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((value) => Number.isFinite(value));
  } catch {
    return [];
  }
}

export async function issueNodeId(slug: string, issue: number): Promise<number> {
  const stdout = await gh(["api", `repos/${slug}/issues/${issue}`, "--jq", ".id"]);
  return Number.parseInt(stdout.trim(), 10);
}

export async function addLabel(issue: number, label: string): Promise<void> {
  await gh(["issue", "edit", String(issue), "--add-label", label]);
}

export async function attachSubIssue(slug: string, parent: number, child: number): Promise<void> {
  const childId = await issueNodeId(slug, child);
  await gh([
    "api",
    "--method",
    "POST",
    `repos/${slug}/issues/${parent}/sub_issues`,
    "-F",
    `sub_issue_id=${childId}`,
  ]);
}

export async function comment(issue: number, body: string): Promise<void> {
  await gh(["issue", "comment", String(issue), "--body", body]);
}
