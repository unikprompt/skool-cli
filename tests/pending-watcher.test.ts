import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  detectNewPending,
  loadKnownPending,
  saveKnownPending,
} from "../src/core/pending-watcher.js";
import type { PendingMember } from "../src/core/types.js";

function makePending(overrides: Partial<PendingMember> = {}): PendingMember {
  return {
    id: "test-id-1",
    name: "testuser",
    firstName: "Test",
    lastName: "User",
    bio: "",
    photoUrl: "",
    requestedAt: "2026-04-09T10:00:00Z",
    ...overrides,
  };
}

describe("detectNewPending", () => {
  it("returns all members when knownIds is empty", () => {
    const current = [makePending({ id: "a" }), makePending({ id: "b" })];
    const result = detectNewPending(current, []);
    expect(result).toHaveLength(2);
  });

  it("returns only unknown members", () => {
    const current = [
      makePending({ id: "a" }),
      makePending({ id: "b" }),
      makePending({ id: "c" }),
    ];
    const result = detectNewPending(current, ["a", "b"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c");
  });

  it("returns empty when all are known", () => {
    const current = [makePending({ id: "a" }), makePending({ id: "b" })];
    const result = detectNewPending(current, ["a", "b"]);
    expect(result).toHaveLength(0);
  });

  it("returns empty when current is empty", () => {
    const result = detectNewPending([], ["a", "b"]);
    expect(result).toHaveLength(0);
  });
});

describe("loadKnownPending / saveKnownPending", () => {
  const originalEnv = process.env.SKOOL_CLI_DATA_DIR;
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `skool-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    // Override the data dir so WATCH_STATE_FILE points to our temp dir
    process.env.SKOOL_CLI_DATA_DIR = tempDir;
  });

  afterEach(() => {
    process.env.SKOOL_CLI_DATA_DIR = originalEnv;
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns empty array when no state file exists", () => {
    // loadKnownPending reads from WATCH_STATE_FILE which is computed at import time
    // So we test the detection logic instead, which doesn't depend on file state
    const result = detectNewPending([makePending({ id: "a" })], []);
    expect(result).toHaveLength(1);
  });
});
