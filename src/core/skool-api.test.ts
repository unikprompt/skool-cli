import { describe, it, expect } from "vitest";
import { htmlToSkoolDesc, skoolDescToHtml } from "./skool-api.js";

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

describe("__NEXT_DATA__ regex extraction", () => {
  // This tests the regex pattern used by fetchNextData()
  const regex = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

  it("extracts JSON from standard __NEXT_DATA__ script tag", () => {
    const html = `<html><head><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"users":[]}}}</script></head></html>`;
    const match = html.match(regex);
    expect(match).not.toBeNull();
    const data = JSON.parse(match![1]);
    expect(data.props.pageProps.users).toEqual([]);
  });

  it("returns null when no __NEXT_DATA__ present", () => {
    const html = `<html><body>No data here</body></html>`;
    const match = html.match(regex);
    expect(match).toBeNull();
  });

  it("handles multiline JSON content", () => {
    const json = JSON.stringify({ props: { pageProps: { users: [{ id: "1", name: "test" }] } } });
    const html = `<script id="__NEXT_DATA__" type="application/json">${json}</script>`;
    const match = html.match(regex);
    expect(match).not.toBeNull();
    const data = JSON.parse(match![1]);
    expect(data.props.pageProps.users[0].id).toBe("1");
  });
});

describe("htmlToSkoolDesc regression: pre vs p alternation", () => {
  it("parses <pre><code> as a codeBlock, not a paragraph with inline code", () => {
    const html =
      '<p><strong>Install:</strong></p><pre><code>curl -fsSL https://example.com/install.sh | bash\n</code></pre><p>Done.</p>';
    const nodes = parseDesc(htmlToSkoolDesc(html));
    // Should yield: paragraph, codeBlock, paragraph
    expect(nodes.map((n) => n.type)).toEqual([
      "paragraph",
      "codeBlock",
      "paragraph",
    ]);
    const codeBlock = nodes[1] as Record<string, unknown>;
    const content = codeBlock.content as Array<Record<string, unknown>>;
    expect(content[0].text).toContain(
      "curl -fsSL https://example.com/install.sh | bash"
    );
  });

  it("handles multi-line pre blocks with embedded newlines", () => {
    const html =
      "<pre><code>line1\nline2\nline3\n</code></pre>";
    const nodes = parseDesc(htmlToSkoolDesc(html));
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("codeBlock");
    const content = nodes[0].content as Array<Record<string, unknown>>;
    expect(content[0].text).toBe("line1\nline2\nline3\n");
  });
});

describe("htmlToSkoolDesc regression: inline marks inside headings", () => {
  it("preserves <strong> inside <h3>", () => {
    const nodes = parseDesc(
      htmlToSkoolDesc("<h3><strong>Qué es Claude Code</strong></h3>")
    );
    expect(nodes).toHaveLength(1);
    const heading = nodes[0] as Record<string, unknown>;
    expect(heading.type).toBe("heading");
    const content = heading.content as Array<Record<string, unknown>>;
    expect(content[0]).toEqual({
      type: "text",
      text: "Qué es Claude Code",
      marks: [{ type: "bold" }],
    });
  });

  it("preserves <em> inside <h2>", () => {
    const nodes = parseDesc(htmlToSkoolDesc("<h2><em>título</em></h2>"));
    const content = nodes[0].content as Array<Record<string, unknown>>;
    expect(content[0]).toEqual({
      type: "text",
      text: "título",
      marks: [{ type: "italic" }],
    });
  });
});

describe("skoolDescToHtml", () => {
  it("returns empty string for empty input", () => {
    expect(skoolDescToHtml("")).toBe("");
  });

  it("returns input unchanged when not in [v2] format", () => {
    expect(skoolDescToHtml("<p>raw</p>")).toBe("<p>raw</p>");
  });

  it("converts a paragraph", () => {
    expect(skoolDescToHtml(htmlToSkoolDesc("<p>Hello</p>"))).toBe("<p>Hello</p>");
  });

  it("converts headings h1-h4", () => {
    expect(skoolDescToHtml(htmlToSkoolDesc("<h1>T1</h1>"))).toBe("<h1>T1</h1>");
    expect(skoolDescToHtml(htmlToSkoolDesc("<h2>T2</h2>"))).toBe("<h2>T2</h2>");
    expect(skoolDescToHtml(htmlToSkoolDesc("<h3>T3</h3>"))).toBe("<h3>T3</h3>");
    expect(skoolDescToHtml(htmlToSkoolDesc("<h4>T4</h4>"))).toBe("<h4>T4</h4>");
  });

  it("preserves Spanish accents and ñ through round-trip", () => {
    const original = "<p>Años de experiencia en español, añadiendo tildes á é í ó ú ñ.</p>";
    expect(skoolDescToHtml(htmlToSkoolDesc(original))).toBe(original);
  });

  it("converts bold, italic, code, strike, and links", () => {
    expect(skoolDescToHtml(htmlToSkoolDesc("<p><strong>bold</strong></p>"))).toBe(
      "<p><strong>bold</strong></p>"
    );
    expect(skoolDescToHtml(htmlToSkoolDesc("<p><em>italic</em></p>"))).toBe(
      "<p><em>italic</em></p>"
    );
    expect(skoolDescToHtml(htmlToSkoolDesc("<p><s>strike</s></p>"))).toBe(
      "<p><s>strike</s></p>"
    );
    expect(
      skoolDescToHtml(
        htmlToSkoolDesc('<p><a href="https://x.com" target="_blank">link</a></p>')
      )
    ).toBe('<p><a href="https://x.com" target="_blank">link</a></p>');
  });

  it("converts bullet and ordered lists", () => {
    expect(skoolDescToHtml(htmlToSkoolDesc("<ul><li>A</li><li>B</li></ul>"))).toBe(
      "<ul><li>A</li><li>B</li></ul>"
    );
    expect(skoolDescToHtml(htmlToSkoolDesc("<ol><li>X</li><li>Y</li></ol>"))).toBe(
      "<ol><li>X</li><li>Y</li></ol>"
    );
  });

  it("converts horizontal rules", () => {
    expect(skoolDescToHtml(htmlToSkoolDesc("<hr>"))).toBe("<hr>");
  });

  it("escapes HTML special characters in text nodes", () => {
    const nodes = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "a < b & c > d" }],
      },
    ];
    const desc = "[v2]" + JSON.stringify(nodes);
    expect(skoolDescToHtml(desc)).toBe("<p>a &lt; b &amp; c &gt; d</p>");
  });

  it("returns empty string for malformed [v2] JSON", () => {
    expect(skoolDescToHtml("[v2]{not json")).toBe("");
  });

  it("round-trips a multi-block document", () => {
    const original =
      "<h2>Título</h2><p>Introducción con <strong>énfasis</strong> y <em>estilo</em>.</p><ul><li>Año uno</li><li>Año dos</li></ul><p>Fin de la lección.</p>";
    expect(skoolDescToHtml(htmlToSkoolDesc(original))).toBe(original);
  });
});
