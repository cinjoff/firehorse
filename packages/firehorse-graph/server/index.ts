import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

import { resolveServerConfig, type ServerConfig } from "./config.ts";
import { handleApiRequest } from "./routes.ts";
import { createSupermemoryClient, type SupermemoryClient } from "./supermemory.ts";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

/**
 * Resolves a URL path inside `root`, or undefined when it escapes it or is
 * not a file. Path traversal matters even on localhost.
 */
function resolveStaticFile(root: string, pathname: string): string | undefined {
  const candidate = resolve(join(root, normalize(decodeURIComponent(pathname))));

  if (candidate !== root && !candidate.startsWith(`${root}/`)) return undefined;
  if (!existsSync(candidate) || !statSync(candidate).isFile()) return undefined;

  return candidate;
}

export interface GraphServerOptions {
  readonly config?: ServerConfig;
  readonly client?: SupermemoryClient;
  /** Directory of the built app. Omit to run API-only, behind `vite dev`. */
  readonly staticRoot?: string;
}

export function createGraphServer(options: GraphServerOptions = {}) {
  const config = options.config ?? resolveServerConfig();
  const client = options.client ?? createSupermemoryClient(config);
  const staticRoot = options.staticRoot ? resolve(options.staticRoot) : undefined;

  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      const url = new URL(request.url ?? "/", `http://localhost:${config.port}`);

      const api = await handleApiRequest(url, client);
      if (api) {
        sendJson(response, api.status, api.body);
        return;
      }

      if (!staticRoot) {
        sendJson(response, 404, { error: "API-only server. Run the app with vite dev." });
        return;
      }

      // Serve the file if it exists, otherwise the shell — it is a single-page app.
      const file =
        resolveStaticFile(staticRoot, url.pathname) ?? resolveStaticFile(staticRoot, "/index.html");

      if (!file) {
        sendJson(response, 404, {
          error: "No built app found. Run pnpm build first.",
        });
        return;
      }

      response.writeHead(200, {
        "Content-Type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
      });
      createReadStream(file).pipe(response);
    })();
  });

  return { server, config };
}

export function startGraphServer(options: GraphServerOptions = {}): Promise<void> {
  const { server, config } = createGraphServer(options);

  return new Promise((resolvePromise, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      reject(
        error.code === "EADDRINUSE"
          ? new Error(
              `Port ${config.port} is taken. Set FIREHORSE_GRAPH_PORT to pick another, or stop what is on it.`,
            )
          : error,
      );
    });

    server.listen(config.port, "127.0.0.1", () => {
      process.stdout.write(
        [
          `firehorse-graph on http://localhost:${config.port}`,
          `supermemory  ${config.apiUrl}`,
          `api key      ${config.apiKeySource ?? "none (the local server accepts unauthenticated reads)"}`,
          "",
        ].join("\n"),
      );
      resolvePromise();
    });
  });
}
