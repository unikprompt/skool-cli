import { describe, it, expect } from "vitest";
import { htmlToSkoolDesc } from "./skool-api.js";

/** Helper: parse the [v2] prefix and return the nodes array */
function parseDesc(desc: string): Record<string, unknown>[] {
  expect(desc.startsWith("[v2]")).toBe(true);
  return JSON.parse(desc.slice(4));
}

describe("htmlToSkoolDesc", () => {
  describe("paragraphs", () => {
    it("converts paragraph", () => {
      const nodes = parseDesc(htmlToSkoolDesc("<p>Hello</p>"));
      expect(nodes).toEqual([
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
      ]);
    });

    it("converts plain text as paragraph", () => {
      const nodes = parseDesc(htmlToSkoolDesc("Just text"));
      expect(nodes).toEqual([
        { type: "paragraph", content: [{ type: "text", text: "Just text" }] },
      ]);
    });
  });

  describe("headings", () => {
    it("converts h1-h4 with level attr", () => {
      const nodes = parseDesc(htmlToSkoolDesc("<h2>Title</h2>"));
      expect(nodes).toEqual([
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Title" }],
        },
      ]);
    });
  });

  describe("inline marks", () => {
    it("converts bold", () => {
      const nodes = parseDesc(
        htmlToSkoolDesc("<p>text <strong>bold</strong> more</p>")
      );
      const content = nodes[0].content as Record<string, unknown>[];
      expect(content).toHaveLength(3);
      expect(content[0]).toEqual({ type: "text", text: "text " });
      expect(content[1]).toEqual({
        type: "text",
        text: "bold",
        marks: [{ type: "bold" }],
      });
      expect(content[2]).toEqual({ type: "text", text: " more" });
    });

    it("converts italic", () => {
      const nodes = parseDesc(htmlToSkoolDesc("<p><em>italic</em></p>"));
      const content = nodes[0].content as Record<string, unknown>[];
      expect(content[0]).toEqual({
        type: "text",
        text: "italic",
        marks: [{ type: "italic" }],
      });
    });

    it("converts strikethrough", () => {
      const nodes = parseDesc(htmlToSkoolDesc("<p><s>deleted</s></p>"));
      const content = nodes[0].content as Record<string, unknown>[];
      expect(content[0]).toEqual({
        type: "text",
        text: "deleted",
        marks: [{ type: "strike" }],
      });
    });

    it("converts links", () => {
      const nodes = parseDesc(
        htmlToSkoolDesc('<p><a href="https://x.com" target="_blank">link</a></p>')
      );
      const content = nodes[0].content as Record<string, unknown>[];
      expect(content[0]).toEqual({
        type: "text",
        text: "link",
        marks: [
          {
            type: "link",
            attrs: { href: "https://x.com", target: "_blank" },
          },
        ],
      });
    });

    it("handles nested bold + italic", () => {
      const nodes = parseDesc(
        htmlToSkoolDesc("<p><strong><em>both</em></strong></p>")
      );
      const content = nodes[0].content as Record<string, unknown>[];
      expect(content[0].marks).toEqual([
        { type: "bold" },
        { type: "italic" },
      ]);
    });
  });

  describe("lists", () => {
    it("converts bullet list", () => {
      const nodes = parseDesc(
        htmlToSkoolDesc("<ul><li>A</li><li>B</li></ul>")
      );
      expect(nodes[0].type).toBe("bulletList");
      const items = nodes[0].content as Record<string, unknown>[];
      expect(items).toHaveLength(2);
      expect(items[0].type).toBe("listItem");
    });

    it("converts ordered list", () => {
      const nodes = parseDesc(
        htmlToSkoolDesc("<ol><li>First</li></ol>")
      );
      expect(nodes[0].type).toBe("orderedList");
    });
  });

  describe("code blocks", () => {
    it("converts pre>code to codeBlock", () => {
      const nodes = parseDesc(
        htmlToSkoolDesc("<pre><code>const x = 1;</code></pre>")
      );
      expect(nodes[0]).toEqual({
        type: "codeBlock",
        content: [{ type: "text", text: "const x = 1;" }],
      });
    });
  });

  describe("blockquotes", () => {
    it("converts blockquote", () => {
      const nodes = parseDesc(
        htmlToSkoolDesc("<blockquote>Quote</blockquote>")
      );
      expect(nodes[0].type).toBe("blockquote");
    });
  });

  describe("horizontal rule", () => {
    it("converts hr", () => {
      const nodes = parseDesc(htmlToSkoolDesc("<hr>"));
      expect(nodes[0]).toEqual({ type: "horizontalRule" });
    });

    it("converts self-closing hr", () => {
      const nodes = parseDesc(htmlToSkoolDesc("<hr />"));
      expect(nodes[0]).toEqual({ type: "horizontalRule" });
    });
  });

  describe("images", () => {
    it("converts img to image node with attrs", () => {
      const nodes = parseDesc(
        htmlToSkoolDesc('<img src="https://img.com/a.png" alt="Logo">')
      );
      expect(nodes[0]).toEqual({
        type: "image",
        attrs: {
          src: "https://img.com/a.png",
          alt: "Logo",
          title: "Logo",
          originalSrc: "https://img.com/a.png",
          fileID: "",
        },
      });
    });

    it("handles image between paragraphs", () => {
      const nodes = parseDesc(
        htmlToSkoolDesc(
          '<p>Before</p><img src="https://img.com/x.png" alt="X"><p>After</p>'
        )
      );
      expect(nodes).toHaveLength(3);
      expect(nodes[0].type).toBe("paragraph");
      expect(nodes[1].type).toBe("image");
      expect(nodes[2].type).toBe("paragraph");
    });
  });

  describe("mixed content", () => {
    it("handles heading + paragraph + list", () => {
      const html =
        "<h2>Title</h2><p>Text with <strong>bold</strong></p><ul><li>Item</li></ul>";
      const nodes = parseDesc(htmlToSkoolDesc(html));
      expect(nodes).toHaveLength(3);
      expect(nodes[0].type).toBe("heading");
      expect(nodes[1].type).toBe("paragraph");
      expect(nodes[2].type).toBe("bulletList");
    });
  });
});
