import { describe, expect, it } from "vitest";

import { DEFAULT_API_URL, DEFAULT_PORT, resolveServerConfig } from "./config.ts";

const noFile = () => {
  throw new Error("ENOENT");
};

describe("resolveServerConfig", () => {
  it("defaults to the self-hosted server", () => {
    const config = resolveServerConfig({ env: {}, home: "/nonexistent", readFile: noFile });

    expect(config.apiUrl).toBe(DEFAULT_API_URL);
    expect(config.port).toBe(DEFAULT_PORT);
    expect(config.apiKey).toBeUndefined();
  });

  it("strips a trailing slash so paths concatenate cleanly", () => {
    const config = resolveServerConfig({
      env: { SUPERMEMORY_API_URL: "http://localhost:6767/" },
      home: "/nonexistent",
      readFile: noFile,
    });

    expect(config.apiUrl).toBe("http://localhost:6767");
  });

  it("prefers an explicit env key over the credentials file", () => {
    const config = resolveServerConfig({
      env: { SUPERMEMORY_API_KEY: "from-env" },
      home: "/home/someone",
      readFile: () => JSON.stringify({ apiKey: "from-file" }),
    });

    expect(config.apiKey).toBe("from-env");
    expect(config.apiKeySource).toBe("SUPERMEMORY_API_KEY");
  });

  it("falls back to the credentials file the supermemory CLI writes", () => {
    const config = resolveServerConfig({
      env: {},
      home: "/home/someone",
      readFile: (path) => {
        expect(path).toBe("/home/someone/.supermemory-claude/credentials.json");
        return JSON.stringify({ apiKey: "from-file" });
      },
    });

    expect(config.apiKey).toBe("from-file");
    expect(config.apiKeySource).toBe("~/.supermemory-claude/credentials.json");
  });

  it("treats an unreadable or malformed credentials file as no key", () => {
    expect(
      resolveServerConfig({ env: {}, home: "/h", readFile: () => "not json" }).apiKey,
    ).toBeUndefined();
    expect(
      resolveServerConfig({ env: {}, home: "/h", readFile: () => "{}" }).apiKey,
    ).toBeUndefined();
  });

  it("rejects a port that is not a port", () => {
    expect(() =>
      resolveServerConfig({
        env: { FIREHORSE_GRAPH_PORT: "not-a-port" },
        home: "/h",
        readFile: noFile,
      }),
    ).toThrow(/must be a port number/);
  });
});
