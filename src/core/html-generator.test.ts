import { describe, it, expect } from "vitest";
import { markdownToHtml } from "./html-generator.js";

describe("markdownToHtml", () => {
  describe("headings", () => {
    it("converts h1-h4", () => {
      expect(markdownToHtml("# Title")).toBe("<h1>Title</h1>");
      expect(markdownToHtml("## Sub")).toBe("<h2>Sub</h2>");
      expect(markdownToHtml("### H3")).toBe("<h3>H3</h3>");
      expect(markdownToHtml("#### H4")).toBe("<h4>H4</h4>");
    });
  });

  describe("paragraphs", () => {
    it("wraps plain text in <p>", () => {
      expect(markdownToHtml("Hello world")).toBe("<p>Hello world</p>");
    });

    it("separates paragraphs by blank lines", () => {
      expect(markdownToHtml("First\n\nSecond")).toBe(
        "<p>First</p><p>Second</p>"
      );
    });
  });

  describe("inline formatting", () => {
    it("converts bold", () => {
      expect(markdownToHtml("text **bold** text")).toBe(
        "<p>text <strong>bold</strong> text</p>"
      );
    });

    it("converts italic", () => {
      expect(markdownToHtml("text *italic* text")).toBe(
        "<p>text <em>italic</em> text</p>"
      );
    });

    it("converts bold+italic", () => {
      expect(markdownToHtml("***both***")).toBe(
        "<p><strong><em>both</em></strong></p>"
      );
    });

    it("converts strikethrough", () => {
      expect(markdownToHtml("~~deleted~~")).toBe("<p><s>deleted</s></p>");
    });

    it("converts inline code", () => {
      expect(markdownToHtml("`code`")).toBe("<p><code>code</code></p>");
    });

    it("converts links", () => {
      expect(markdownToHtml("[Click](https://example.com)")).toBe(
        '<p><a href="https://example.com" target="_blank">Click</a></p>'
      );
    });
  });

  describe("images", () => {
    it("converts standalone image", () => {
      expect(markdownToHtml("![Alt](https://img.com/a.png)")).toBe(
        '<img src="https://img.com/a.png" alt="Alt">'
      );
    });

    it("handles image between text blocks", () => {
      const result = markdownToHtml(
        "Before\n\n![Logo](https://img.com/logo.png)\n\nAfter"
      );
      expect(result).toContain("<p>Before</p>");
      expect(result).toContain('<img src="https://img.com/logo.png" alt="Logo">');
      expect(result).toContain("<p>After</p>");
    });
  });

  describe("lists", () => {
    it("converts bullet list", () => {
      const result = markdownToHtml("- Item 1\n- Item 2");
      expect(result).toBe("<ul><li>Item 1</li><li>Item 2</li></ul>");
    });

    it("converts numbered list", () => {
      const result = markdownToHtml("1. First\n2. Second");
      expect(result).toBe("<ol><li>First</li><li>Second</li></ol>");
    });

    it("handles inline formatting in list items", () => {
      const result = markdownToHtml("- **Bold** item\n- *Italic* item");
      expect(result).toContain("<strong>Bold</strong>");
      expect(result).toContain("<em>Italic</em>");
    });
  });

  describe("code blocks", () => {
    it("converts fenced code block", () => {
      const result = markdownToHtml("```\nconst x = 1;\n```");
      expect(result).toBe("<pre><code>const x = 1;</code></pre>");
    });

    it("handles language hint", () => {
      const result = markdownToHtml("```javascript\nconst x = 1;\n```");
      expect(result).toBe("<pre><code>const x = 1;</code></pre>");
    });
  });

  describe("blockquotes", () => {
    it("converts single-line blockquote", () => {
      const result = markdownToHtml("> Quote text");
      expect(result).toBe(
        "<blockquote><p>Quote text</p></blockquote>"
      );
    });

    it("converts multi-line blockquote", () => {
      const result = markdownToHtml("> Line 1\n> Line 2");
      expect(result).toBe(
        "<blockquote><p>Line 1 Line 2</p></blockquote>"
      );
    });
  });

  describe("mixed content", () => {
    it("handles heading + paragraph + list", () => {
      const md = "## Title\n\nSome text.\n\n- Item 1\n- Item 2";
      const result = markdownToHtml(md);
      expect(result).toContain("<h2>Title</h2>");
      expect(result).toContain("<p>Some text.</p>");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>Item 1</li>");
    });
  });
});
