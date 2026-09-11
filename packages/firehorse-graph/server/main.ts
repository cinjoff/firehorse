import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveServerConfig } from "./config.ts";
import { ensureServer } from "./ensure.ts";
import { startGraphServer } from "./index.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(packageRoot, "dist");

const config = resolveServerConfig();
const outcome = await ensureServer(config);

if (outcome.kind === "reused") {
  // Running the command twice opens the browser rather than failing.
  process.stdout.write(`firehorse-graph already running on ${outcome.url}\n`);
  process.exit(0);
}

if (outcome.kind === "occupied") {
  process.stderr.write(
    [
      `Port ${config.port} is taken by something that is not firehorse-graph.`,
      "Set FIREHORSE_GRAPH_PORT to pick another, or stop what is on it.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

try {
  await startGraphServer(existsSync(join(dist, "index.html")) ? { staticRoot: dist } : {});
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
