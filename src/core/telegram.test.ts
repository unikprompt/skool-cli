import { describe, it, expect } from "vitest";
import { formatNewMemberMessage } from "./telegram.js";

describe("formatNewMemberMessage", () => {
  it("formats a message with member name, group, and time", () => {
    const msg = formatNewMemberMessage("Juan Perez", "operadores-aumentados", "");
    expect(msg).toContain("Juan Perez");
    expect(msg).toContain("operadores-aumentados");
    expect(msg).toContain("just now");
  });

  it("escapes HTML entities in names", () => {
    const msg = formatNewMemberMessage("Test <script>", "group&name", "");
    expect(msg).toContain("&lt;script&gt;");
    expect(msg).toContain("group&amp;name");
    expect(msg).not.toContain("<script>");
  });

  it("shows relative time for recent joins", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const msg = formatNewMemberMessage("Ana", "test", fiveMinAgo);
    expect(msg).toContain("5m ago");
  });

  it("shows hours for older joins", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    const msg = formatNewMemberMessage("Ana", "test", twoHoursAgo);
    expect(msg).toContain("2h ago");
  });
});
