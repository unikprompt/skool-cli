/**
 * Direct HTTP API client for Skool's internal API (api2.skool.com).
 * Discovered via network interception.
 *
 * Uses auth cookies from the browser session for authentication.
 */

import { BrowserManager } from "./browser-manager.js";

const API_BASE = "https://api2.skool.com";

/**
 * Convert HTML to Skool's TipTap JSON desc format.
 * Skool stores content as "[v2]" + JSON array of TipTap nodes.
 *
 * Supported: paragraphs, headings (h1-h4), bullet lists, ordered lists,
 * bold, italic, code, code blocks, links, horizontal rules.
 */
function htmlToSkoolDesc(html: string): string {
  const nodes: Record<string, unknown>[] = [];

  // Simple HTML parser — convert HTML tags to TipTap JSON nodes
  // Split by block-level tags
  const blockRegex = /<(h[1-4]|p|ul|ol|pre|hr|blockquote)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let match;
  let lastIndex = 0;

  while ((match = blockRegex.exec(html)) !== null) {
    // Check for text between blocks
    const between = html.slice(lastIndex, match.index).trim();
    if (between) {
      nodes.push({ type: "paragraph", content: parseInline(between) });
    }
    lastIndex = match.index + match[0].length;

    const tag = (match[1] || "").toLowerCase();
    const inner = match[2] || "";

    if (tag.startsWith("h")) {
      const level = parseInt(tag[1]);
      nodes.push({
        type: "heading",
        attrs: { level },
        content: parseInline(stripTags(inner)),
      });
    } else if (tag === "p") {
      nodes.push({ type: "paragraph", content: parseInline(inner) });
    } else if (tag === "ul") {
      nodes.push({ type: "bulletList", content: parseListItems(inner) });
    } else if (tag === "ol") {
      nodes.push({ type: "orderedList", content: parseListItems(inner) });
    } else if (tag === "pre") {
      const code = stripTags(inner).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      nodes.push({
        type: "codeBlock",
        content: [{ type: "text", text: code }],
      });
    } else if (tag === "blockquote") {
      nodes.push({
        type: "blockquote",
        content: [{ type: "paragraph", content: parseInline(stripTags(inner)) }],
      });
    } else if (match[0].startsWith("<hr")) {
      nodes.push({ type: "horizontalRule" });
    }
  }

  // Remaining text after last block
  const remaining = html.slice(lastIndex).trim();
  if (remaining) {
    nodes.push({ type: "paragraph", content: parseInline(remaining) });
  }

  // If no blocks were found, treat the whole thing as a paragraph
  if (nodes.length === 0 && html.trim()) {
    nodes.push({ type: "paragraph", content: parseInline(html) });
  }

  return "[v2]" + JSON.stringify(nodes);
}

/** Parse inline HTML (bold, italic, code, links) into TipTap text nodes with marks */
function parseInline(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];

  // Regex to find inline formatting tags
  const inlineRegex = /<(strong|b|em|i|code|s|a)([^>]*)>([\s\S]*?)<\/\1>|([^<]+)/gi;
  let match;

  while ((match = inlineRegex.exec(html)) !== null) {
    if (match[4]) {
      // Plain text (no tag) — preserve spaces for inline continuity
      const text = decodeEntities(match[4]);
      if (text) nodes.push({ type: "text", text });
    } else {
      const tag = match[1].toLowerCase();
      const attrs = match[2] || "";
      const inner = decodeEntities(stripTags(match[3]));
      if (!inner.trim()) continue;

      const marks: Record<string, unknown>[] = [];
      if (tag === "strong" || tag === "b") marks.push({ type: "bold" });
      if (tag === "em" || tag === "i") marks.push({ type: "italic" });
      if (tag === "code") marks.push({ type: "code" });
      if (tag === "s") marks.push({ type: "strike" });
      if (tag === "a") {
        const hrefMatch = attrs.match(/href="([^"]+)"/);
        if (hrefMatch) {
          marks.push({ type: "link", attrs: { href: hrefMatch[1], target: "_blank" } });
        }
      }

      if (marks.length > 0) {
        nodes.push({ type: "text", text: inner, marks });
      } else {
        nodes.push({ type: "text", text: inner });
      }
    }
  }

  if (nodes.length === 0) {
    const text = decodeEntities(stripTags(html).trim());
    if (text) return [{ type: "text", text }];
    return [{ type: "text", text: " " }];
  }

  return nodes;
}

/** Decode HTML entities */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Parse <li> items from a list */
function parseListItems(html: string): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch;
  while ((liMatch = liRegex.exec(html)) !== null) {
    items.push({
      type: "listItem",
      content: [
        { type: "paragraph", content: parseInline(liMatch[1]) },
      ],
    });
  }
  return items;
}

/** Strip HTML tags */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export class SkoolApi {
  constructor(private browser: BrowserManager) {}

  /** Get auth cookies from the browser session */
  private async getCookies(): Promise<string> {
    const page = await this.browser.getPage();
    const context = page.context();
    const cookies = await context.cookies();
    return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  }

  /** Make an authenticated API request */
  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<{ status: number; data: Record<string, unknown> }> {
    const cookies = await this.getCookies();
    const url = `${API_BASE}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Cookie: cookies,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Origin: "https://www.skool.com",
        Referer: "https://www.skool.com/",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { error: text };
    }
    return { status: response.status, data };
  }

  /**
   * Create a new page (lesson) in a course.
   *
   * @param groupId - Group ID (from the classroom URL or course data)
   * @param userId - User ID (the logged-in user)
   * @param parentId - Parent folder/module ID
   * @param rootId - Root course ID
   * @param title - Page title
   * @param content - HTML content for the page body
   */
  async createPage(options: {
    groupId: string;
    userId: string;
    parentId: string;
    rootId: string;
    title: string;
    content?: string;
  }): Promise<{ success: boolean; pageId: string; message: string }> {
    const { groupId, userId, parentId, rootId, title, content } = options;

    // Step 1: Create the page
    const createResult = await this.request("POST", "/courses", {
      group_id: groupId,
      user_id: userId,
      parent_id: parentId,
      root_id: rootId,
      unit_type: "module",
      state: 2,
      metadata: {
        title,
        resources: "[]",
      },
    });

    if (createResult.status !== 200) {
      return {
        success: false,
        pageId: "",
        message: `Create failed with status ${createResult.status}: ${JSON.stringify(createResult.data)}`,
      };
    }

    const pageId = createResult.data.id as string;

    // Step 2: If content provided, update the page with content
    // Skool uses TipTap JSON format with [v2] prefix for the desc field
    if (content) {
      const desc = htmlToSkoolDesc(content);
      const updateResult = await this.request("PUT", `/courses/${pageId}`, {
        title,
        desc,
        transcript: null,
        video_id: "",
      });

      if (updateResult.status !== 200) {
        return {
          success: true,
          pageId,
          message: `Page created but content update failed (${updateResult.status}): ${JSON.stringify(updateResult.data)}`,
        };
      }
    }

    return {
      success: true,
      pageId,
      message: `Page "${title}" created successfully. ID: ${pageId}`,
    };
  }

  /**
   * List courses and their modules for a group.
   * This gives us the real root_id and parent_id (folder IDs) needed for API calls.
   */
  async listCourses(groupId: string): Promise<Record<string, unknown>[]> {
    const result = await this.request("GET", `/courses?group_id=${groupId}`);
    if (result.status === 200 && Array.isArray(result.data)) {
      return result.data as Record<string, unknown>[];
    }
    // Maybe the response is wrapped
    if (result.data.courses && Array.isArray(result.data.courses)) {
      return result.data.courses as Record<string, unknown>[];
    }
    // Try with the data directly
    return [result.data];
  }

  /**
   * Create a folder (module) in a course.
   */
  async createFolder(options: {
    groupId: string;
    parentId: string;
    rootId: string;
    title: string;
  }): Promise<{ success: boolean; folderId: string; message: string }> {
    const result = await this.request("POST", "/courses", {
      group_id: options.groupId,
      parent_id: options.parentId,
      root_id: options.rootId,
      unit_type: "set",
      state: 2,
      metadata: { title: options.title },
    });

    if (result.status !== 200) {
      return {
        success: false,
        folderId: "",
        message: `Create folder failed (${result.status}): ${JSON.stringify(result.data)}`,
      };
    }

    return {
      success: true,
      folderId: result.data.id as string,
      message: `Folder "${options.title}" created. ID: ${result.data.id}`,
    };
  }

  /**
   * List all items (folders + pages) in a course.
   */
  async listCourseItems(
    groupId: string,
    rootId: string
  ): Promise<Record<string, unknown>[]> {
    // Try different endpoint patterns
    for (const path of [
      `/courses?group_id=${groupId}&root_id=${rootId}`,
      `/courses?group_id=${groupId}`,
      `/courses/${rootId}/children`,
      `/courses/${rootId}`,
    ]) {
      const result = await this.request("GET", path);
      if (result.status === 200) {
        if (Array.isArray(result.data)) return result.data;
        // Single course with children
        if (result.data.children && Array.isArray(result.data.children))
          return result.data.children as Record<string, unknown>[];
        if (result.data.items && Array.isArray(result.data.items))
          return result.data.items as Record<string, unknown>[];
        // Single item response - could be the course itself
        if (result.data.id) return [result.data];
      }
    }
    return [];
  }

  /**
   * Delete a page by ID.
   */
  async deletePage(pageId: string): Promise<boolean> {
    const result = await this.request("DELETE", `/courses/${pageId}`);
    return result.status === 200 || result.status === 204;
  }

  /**
   * Extract group_id, user_id, root_id from the classroom page.
   * These IDs are needed for API calls.
   */
  async getClassroomIds(
    groupSlug: string,
    courseName?: string
  ): Promise<{
    groupId: string;
    userId: string;
    rootId: string;
    courseUrl: string;
  } | null> {
    const page = await this.browser.getPage();

    // Navigate to classroom
    await page.goto(`https://www.skool.com/${groupSlug}/classroom`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    // Click into course if needed
    if (courseName) {
      const courseCard = page.getByText(courseName, { exact: false });
      await courseCard.first().click();
      await page.waitForTimeout(3000);
    } else {
      const courseLink = page.locator('a[href*="/classroom/"]').first();
      if ((await courseLink.count()) > 0) {
        await courseLink.click();
        await page.waitForTimeout(3000);
      }
    }

    const courseUrl = page.url();

    // Intercept the next API call to capture IDs
    // The IDs were visible in the telemetry calls:
    // group_id, member_id from the pv telemetry event
    // We can also extract from the URL and page data

    // Extract from page context using __NEXT_DATA__ or similar
    const ids = await page.evaluate(() => {
      // Try to find IDs from the React state or data attributes
      // The telemetry calls contain: group_id, member_id
      // Check __NEXT_DATA__ (Next.js)
      const nextData = (window as unknown as { __NEXT_DATA__?: { props?: { pageProps?: Record<string, unknown> } } }).__NEXT_DATA__;
      if (nextData?.props?.pageProps) {
        const props = nextData.props.pageProps as Record<string, unknown>;
        return {
          groupId: (props.group_id || props.groupId || "") as string,
          userId: (props.user_id || props.userId || "") as string,
        };
      }
      return null;
    });

    if (ids?.groupId && ids?.userId) {
      // Extract rootId from URL: /classroom/{rootId}?md=...
      const urlMatch = courseUrl.match(/\/classroom\/([a-f0-9]+)/);
      const rootId = urlMatch ? urlMatch[1] : "";

      return {
        groupId: ids.groupId,
        userId: ids.userId,
        rootId,
        courseUrl,
      };
    }

    return null;
  }
}
