import { resolveServerConfig, type ServerConfig } from "./config.ts";

export type EnsureOutcome =
  | { readonly kind: "reused"; readonly url: string }
  | { readonly kind: "free" }
  | { readonly kind: "occupied"; readonly url: string };

/**
 * Running the command twice should open the browser, not fail. So before
 * binding, ask whatever is on the port whether it is one of ours: a healthy
 * `/api/health` means reuse it, any other answer means something else owns the
 * port and we must not talk over it.
 */
export async function ensureServer(
  config: ServerConfig = resolveServerConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<EnsureOutcome> {
  const url = `http://localhost:${config.port}`;

  let response: Response;

  try {
    response = await fetchImpl(`${url}/api/health`);
  } catch {
    // Nothing is listening, which is the ordinary first-run case.
    return { kind: "free" };
  }

  if (!response.ok) return { kind: "occupied", url };

  const body: unknown = await response.json().catch(() => undefined);
  const healthy =
    typeof body === "object" && body !== null && (body as { ok?: unknown }).ok === true;

  return healthy ? { kind: "reused", url } : { kind: "occupied", url };
}
