import { describe, it, expect } from "vitest";
import { detectNewMembers, parseInterval } from "./member-watcher.js";
import { SkoolMember } from "./types.js";

function makeMember(id: string, firstName: string): SkoolMember {
  return {
    id,
    name: firstName.toLowerCase(),
    firstName,
    lastName: "Test",
    bio: "",
    level: 1,
    points: 0,
    contributions: 0,
    role: "member",
    joinedAt: new Date().toISOString(),
    photoUrl: "",
  };
}

describe("detectNewMembers", () => {
  it("returns empty when all members are known", () => {
    const members = [makeMember("1", "Ana"), makeMember("2", "Juan")];
    const known = ["1", "2"];
    expect(detectNewMembers(members, known)).toEqual([]);
  });

  it("returns new members not in known list", () => {
    const members = [
      makeMember("1", "Ana"),
      makeMember("2", "Juan"),
      makeMember("3", "Carlos"),
    ];
    const known = ["1", "2"];
    const result = detectNewMembers(members, known);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
    expect(result[0].firstName).toBe("Carlos");
  });

  it("returns all members when known list is empty", () => {
    const members = [makeMember("1", "Ana"), makeMember("2", "Juan")];
    const result = detectNewMembers(members, []);
    expect(result).toHaveLength(2);
  });

  it("handles empty current members", () => {
    const result = detectNewMembers([], ["1", "2"]);
    expect(result).toEqual([]);
  });
});

describe("parseInterval", () => {
  it("parses minutes", () => {
    expect(parseInterval("5m")).toBe(5 * 60000);
    expect(parseInterval("10m")).toBe(10 * 60000);
  });

  it("parses hours", () => {
    expect(parseInterval("1h")).toBe(3600000);
    expect(parseInterval("2h")).toBe(7200000);
  });

  it("enforces minimum of 1 minute", () => {
    expect(parseInterval("10s")).toBe(60000);
    expect(parseInterval("30s")).toBe(60000);
  });

  it("returns default for invalid input", () => {
    expect(parseInterval("abc")).toBe(5 * 60000);
    expect(parseInterval("")).toBe(5 * 60000);
  });
});
