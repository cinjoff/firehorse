import { readFile } from "node:fs/promises";
import nodePath from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = process.cwd();
const repoRoot = nodePath.dirname(nodePath.dirname(packageRoot));

const installerPath = nodePath.join(repoRoot, "install.sh");
const bundledHelperPath = nodePath.join(
  repoRoot,
  "packages/firehorse-claude/skills/firehorse-setup/superset-mcp-headers.mjs",
);

/**
 * `install.sh` runs through `curl | bash`, so it cannot read a repo file and has
 * to carry the headers helper as a heredoc. That makes two copies on disk; this
 * test is what stops them drifting.
 */
function extractInstallerHeredoc(installer: string): string {
  const match = /<<'HELPER_EOF'\n([\s\S]*?)\nHELPER_EOF\n/.exec(installer);
  if (!match) {
    throw new Error("install.sh no longer carries a HELPER_EOF heredoc.");
  }
  return match[1]!;
}

describe("superset MCP headers helper", () => {
  it("is byte-identical in install.sh and the bundled skill file", async () => {
    const [installer, bundled] = await Promise.all([
      readFile(installerPath, "utf8"),
      readFile(bundledHelperPath, "utf8"),
    ]);

    expect(extractInstallerHeredoc(installer)).toBe(bundled.trimEnd());
  });

  it("reads the API key at request time rather than embedding one", async () => {
    const bundled = await readFile(bundledHelperPath, "utf8");

    expect(bundled).toContain("process.env.SUPERSET_API_KEY");
    expect(bundled).toContain("FIREHORSE_SUPERSET_ENV_FILE");
    expect(bundled).not.toMatch(/sk_(live|test)_[A-Za-z0-9]/);
  });
});
