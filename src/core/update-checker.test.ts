import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { compareVersions } from "./update-checker.js";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("2.1.1", "2.1.1")).toBe(0);
  });

  it("returns -1 when first is older (major)", () => {
    expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
  });

  it("returns -1 when first is older (minor)", () => {
    expect(compareVersions("2.1.0", "2.2.0")).toBe(-1);
  });

  it("returns -1 when first is older (patch)", () => {
    expect(compareVersions("2.1.1", "2.1.2")).toBe(-1);
  });

  it("returns 1 when first is newer", () => {
    expect(compareVersions("3.0.0", "2.9.9")).toBe(1);
    expect(compareVersions("2.2.0", "2.1.9")).toBe(1);
  });

  it("handles missing patch segment", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0", "1.0.1")).toBe(-1);
  });
});

describe("checkForUpdate", () => {
  const originalEnv = process.env.SKOOL_CLI_NO_UPDATE_CHECK;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SKOOL_CLI_NO_UPDATE_CHECK;
    } else {
      process.env.SKOOL_CLI_NO_UPDATE_CHECK = originalEnv;
    }
  });

  it("is exported as a function", async () => {
    const mod = await import("./update-checker.js");
    expect(typeof mod.checkForUpdate).toBe("function");
  });
});
