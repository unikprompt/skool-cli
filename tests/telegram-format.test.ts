import { describe, it, expect } from "vitest";
import {
  formatNewMemberMessage,
  formatPendingMemberMessage,
} from "../src/core/telegram.js";

describe("formatNewMemberMessage", () => {
  it("formats a basic new member message", () => {
    const msg = formatNewMemberMessage("John Doe", "my-group", "2026-04-09T10:00:00Z");
    expect(msg).toContain("New member in my-group");
    expect(msg).toContain("John Doe");
  });

  it("escapes HTML in member name", () => {
    const msg = formatNewMemberMessage("<script>alert</script>", "group", "");
    expect(msg).toContain("&lt;script&gt;");
    expect(msg).not.toContain("<script>");
  });
});

describe("formatPendingMemberMessage", () => {
  it("formats a basic pending member message", () => {
    const msg = formatPendingMemberMessage("Jane Smith", "my-group", "2026-04-09T10:00:00Z");
    expect(msg).toContain("Pending request in my-group");
    expect(msg).toContain("Jane Smith");
    expect(msg).toContain("Requested");
  });

  it("includes Q&A when questions are provided", () => {
    const questions = [
      { question: "Why do you want to join?", answer: "To learn AI" },
      { question: "Experience level?", answer: "Beginner" },
    ];
    const msg = formatPendingMemberMessage("Jane Smith", "my-group", "2026-04-09T10:00:00Z", questions);
    expect(msg).toContain("Why do you want to join?");
    expect(msg).toContain("To learn AI");
    expect(msg).toContain("Experience level?");
    expect(msg).toContain("Beginner");
  });

  it("does not include Q&A section when no questions", () => {
    const msg = formatPendingMemberMessage("Jane Smith", "my-group", "2026-04-09T10:00:00Z");
    expect(msg).not.toContain("Q:");
    expect(msg).not.toContain("A:");
  });

  it("does not include Q&A section when empty questions array", () => {
    const msg = formatPendingMemberMessage("Jane Smith", "my-group", "2026-04-09T10:00:00Z", []);
    expect(msg).not.toContain("Q:");
  });

  it("escapes HTML in questions and answers", () => {
    const questions = [
      { question: "What is <b>your</b> name?", answer: "I'm <John>" },
    ];
    const msg = formatPendingMemberMessage("User", "group", "", questions);
    expect(msg).toContain("&lt;b&gt;");
    expect(msg).toContain("&lt;John&gt;");
  });
});
