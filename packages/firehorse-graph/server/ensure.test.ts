import { describe, expect, it, vi } from "vitest";

import { resolveServerConfig } from "./config.ts";
import { ensureServer } from "./ensure.ts";

const config = resolveServerConfig({ env: {}, home: "/nonexistent", readFile: () => "" });

function ensure(fetchImpl: typeof fetch) {
  return ensureServer(config, fetchImpl);
}

describe("ensureServer", () => {
  it("reports the port free when nothing is listening", async () => {
    const outcome = await ensure(vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    expect(outcome).toEqual({ kind: "free" });
  });

  it("reuses a healthy instance so a second run opens the browser", async () => {
    const outcome = await ensure(
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, projects: 2 }))),
    );

    expect(outcome).toEqual({ kind: "reused", url: "http://localhost:5187" });
  });

  it("refuses to talk over something else on the port", async () => {
    const outcome = await ensure(
      vi.fn().mockResolvedValue(new Response("<html>someone else</html>", { status: 200 })),
    );

    expect(outcome.kind).toBe("occupied");
  });

  it("treats an erroring response on the port as occupied, not reusable", async () => {
    const outcome = await ensure(vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));

    expect(outcome.kind).toBe("occupied");
  });
});
