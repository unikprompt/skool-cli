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
export function htmlToSkoolDesc(html: string): string {
  const nodes: Record<string, unknown>[] = [];

  // Simple HTML parser — convert HTML tags to TipTap JSON nodes
  // Split by block-level tags (including self-closing img)
  const blockRegex = /<(h[1-4]|p|ul|ol|pre|hr|blockquote)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>|<img\s+[^>]*\/?>/gi;
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
    } else if (match[0].startsWith("<img")) {
      const srcMatch = match[0].match(/src="([^"]+)"/);
      const altMatch = match[0].match(/alt="([^"]*)"/);
      if (srcMatch) {
        nodes.push({
          type: "image",
          attrs: {
            src: srcMatch[1],
            alt: altMatch ? altMatch[1] : "",
            title: altMatch ? altMatch[1] : "",
            originalSrc: srcMatch[1],
            fileID: "",
          },
        });
      }
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
function parseInline(
  html: string,
  inheritedMarks: Record<string, unknown>[] = []
): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];

  // Regex to find inline formatting tags
  const inlineRegex =
    /<(strong|b|em|i|code|s|a)([^>]*)>([\s\S]*?)<\/\1>|([^<]+)/gi;
  let match;

  while ((match = inlineRegex.exec(html)) !== null) {
    if (match[4]) {
      // Plain text (no tag)
      const text = decodeEntities(match[4]);
      if (text) {
        if (inheritedMarks.length > 0) {
          nodes.push({ type: "text", text, marks: [...inheritedMarks] });
        } else {
          nodes.push({ type: "text", text });
        }
      }
    } else {
      const tag = match[1].toLowerCase();
      const attrs = match[2] || "";
      const inner = match[3];

      const marks: Record<string, unknown>[] = [...inheritedMarks];
      if (tag === "strong" || tag === "b") marks.push({ type: "bold" });
      if (tag === "em" || tag === "i") marks.push({ type: "italic" });
      if (tag === "code") marks.push({ type: "code" });
      if (tag === "s") marks.push({ type: "strike" });
      if (tag === "a") {
        const hrefMatch = attrs.match(/href="([^"]+)"/);
        if (hrefMatch) {
          marks.push({
            type: "link",
            attrs: { href: hrefMatch[1], target: "_blank" },
          });
        }
      }

      // Check if inner contains nested tags — if so, recurse
      if (/<[^>]+>/.test(inner)) {
        const nested = parseInline(inner, marks);
        nodes.push(...nested);
      } else {
        const text = decodeEntities(inner);
        if (!text.trim()) continue;
        nodes.push({ type: "text", text, marks });
      }
    }
  }

  if (nodes.length === 0) {
    const text = decodeEntities(stripTags(html).trim());
    if (text) {
      if (inheritedMarks.length > 0) {
        return [{ type: "text", text, marks: [...inheritedMarks] }];
      }
      return [{ type: "text", text }];
    }
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
   * Upload a file to Skool's storage (S3 via presigned URL).
   * Returns the file ID and the public read URL.
   */
  async uploadFile(
    filePath: string,
    groupId: string
  ): Promise<{ fileId: string; readUrl: string } | null> {
    const { readFileSync } = await import("node:fs");
    const { basename, extname } = await import("node:path");

    const fileBuffer = readFileSync(filePath);
    const fileName = basename(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const contentType = contentTypeMap[ext] || "application/octet-stream";

    // Step 1: Register file and get presigned upload URL
    const registerResult = await this.request("POST", "/files", {
      file_name: fileName,
      content_type: contentType,
      content_length: fileBuffer.length,
      content_disposition: "",
      ref: "",
      owner_id: groupId,
      large_thumbnail: false,
    });

    if (registerResult.status !== 200 || !registerResult.data.write_url) {
      return null;
    }

    const fileId = (registerResult.data.file as Record<string, unknown>)?.id as string;
    const writeUrl = registerResult.data.write_url as string;
    const waitToken = registerResult.data.wait_token as string;

    // Step 2: Upload binary to S3 presigned URL
    await fetch(writeUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-acl": "public-read",
      },
      body: fileBuffer,
    });

    // Step 3: Wait for processing
    for (let i = 0; i < 10; i++) {
      const waitResult = await this.request("GET", `/wait?token=${waitToken}`);
      const waitData = JSON.stringify(waitResult.data);
      if (!waitData.includes("in-progress")) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Step 4: Get processed file info
    const fileResult = await this.request("GET", `/files?ids=${fileId}`);
    const files = fileResult.data.files as Record<string, unknown>[] | undefined;
    if (files && files.length > 0) {
      const meta = files[0].metadata as Record<string, unknown>;
      const readUrl = (meta?.read_url as string) || "";
      return { fileId, readUrl };
    }

    return { fileId, readUrl: "" };
  }

  /**
   * Create a new course in a group.
   */
  async createCourse(options: {
    groupId: string;
    userId: string;
    title: string;
    description?: string;
    privacy?: number;
    coverImage?: string;
    coverImageFile?: string;
  }): Promise<{ success: boolean; courseId: string; message: string }> {
    const { groupId, userId, title, description, privacy, coverImage, coverImageFile } = options;

    const metadata: Record<string, unknown> = {
      title,
      desc: description || "",
      privacy: privacy ?? 0,
      min_tier: 0,
    };
    if (coverImage) metadata.cover_image = coverImage;
    if (coverImageFile) metadata.cover_image_file = coverImageFile;

    const result = await this.request("POST", "/courses", {
      group_id: groupId,
      user_id: userId,
      unit_type: "course",
      state: 2,
      is_afl_comp_eligible: false,
      metadata,
    });

    if (result.status !== 200) {
      return {
        success: false,
        courseId: "",
        message: `Create course failed with status ${result.status}: ${JSON.stringify(result.data)}`,
      };
    }

    const courseId = result.data.id as string;
    return {
      success: true,
      courseId,
      message: `Course "${title}" created successfully. ID: ${courseId}`,
    };
  }

  /**
   * Move a course left or right in the classroom order.
   */
  async moveCourse(
    courseId: string,
    direction: "left" | "right"
  ): Promise<{ success: boolean; message: string }> {
    const dst = direction === "left" ? 0 : 1;
    const result = await this.request("POST", `/courses/${courseId}/move2?dst=${dst}`);
    if (result.status !== 200) {
      return { success: false, message: `Move failed: ${JSON.stringify(result.data)}` };
    }
    return { success: true, message: `Course moved ${direction}` };
  }

  /**
   * Duplicate a course with all its content.
   */
  async duplicateCourse(
    courseId: string
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.request("POST", `/courses/${courseId}/duplicate`);
    if (result.status !== 200) {
      return { success: false, message: `Duplicate failed: ${JSON.stringify(result.data)}` };
    }
    return { success: true, message: `Course duplication started. It may take a moment to appear.` };
  }

  /**
   * Update a course's metadata (title, description, privacy).
   */
  async updateCourse(
    courseId: string,
    metadata: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.request("PUT", `/courses/${courseId}`, {
      metadata,
    });

    if (result.status !== 200) {
      return {
        success: false,
        message: `Update failed with status ${result.status}: ${JSON.stringify(result.data)}`,
      };
    }

    return { success: true, message: `Course ${courseId} updated successfully` };
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
    videoUrl?: string;
    resources?: { title: string; link: string }[];
  }): Promise<{ success: boolean; pageId: string; message: string }> {
    const { groupId, userId, parentId, rootId, title, content, videoUrl, resources } = options;

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

    // Step 2: Update the page with content, video, and/or resources
    if (content || videoUrl || resources) {
      const updateResult = await this.updatePage(pageId, {
        title,
        content,
        videoUrl,
        resources,
      });

      if (!updateResult.success) {
        return {
          success: true,
          pageId,
          message: `Page created but update failed: ${updateResult.message}`,
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
   * Fetch video metadata from a URL (YouTube, Vimeo, Loom, etc.)
   */
  async getVideoMeta(
    url: string
  ): Promise<{ lenMs: number; thumbnail: string } | null> {
    const encoded = encodeURIComponent(url);
    const result = await this.request(
      "POST",
      `/video-meta?url=${encoded}&width=1280`
    );
    if (result.status === 200 && result.data) {
      return {
        lenMs: (result.data.duration_ms as number) || 0,
        thumbnail: (result.data.thumbnail as string) || "",
      };
    }
    return null;
  }

  /**
   * Update an existing page's title, content, video, and/or resources.
   */
  async updatePage(
    pageId: string,
    options: {
      title?: string;
      content?: string;
      videoUrl?: string;
      resources?: { title: string; link: string }[];
    }
  ): Promise<{ success: boolean; message: string }> {
    const body: Record<string, unknown> = {
      transcript: null,
      video_id: "",
    };
    if (options.title) body.title = options.title;
    if (options.content) body.desc = htmlToSkoolDesc(options.content);

    if (options.videoUrl) {
      body.video_link = options.videoUrl;
      const meta = await this.getVideoMeta(options.videoUrl);
      if (meta) {
        body.video_len_ms = meta.lenMs;
        body.video_thumbnail = meta.thumbnail;
      }
    }

    if (options.resources) {
      body.resources = options.resources;
      body.update_resources = true;
    }

    const result = await this.request("PUT", `/courses/${pageId}`, body);

    if (result.status !== 200) {
      return {
        success: false,
        message: `Update failed with status ${result.status}: ${JSON.stringify(result.data)}`,
      };
    }

    return { success: true, message: `Lesson ${pageId} updated successfully` };
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
   * Move a page to a different parent folder.
   */
  async movePage(
    pageId: string,
    newParentId: string
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.request(
      "POST",
      `/courses/${pageId}/update-parent?parent=${newParentId}`
    );

    if (result.status !== 200) {
      return {
        success: false,
        message: `Move failed with status ${result.status}: ${JSON.stringify(result.data)}`,
      };
    }

    return { success: true, message: `Lesson ${pageId} moved successfully` };
  }

  /**
   * Create a calendar event.
   */
  async createEvent(options: {
    groupId: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    timezone?: string;
    coverImage?: string;
    recurrence?: { frequency: string; interval: number; days: number[] };
  }): Promise<{ success: boolean; eventId: string; message: string }> {
    const metadata: Record<string, unknown> = {
      title: options.title,
      description: options.description || "",
      timezone: options.timezone || "America/New_York",
      reminder_disabled: 0,
      location: JSON.stringify({ location_type: 5, location_info: "" }),
      privacy: JSON.stringify({ privacy_type: 0 }),
    };
    if (options.coverImage) metadata.cover_image = options.coverImage;

    const body: Record<string, unknown> = {
      group_id: options.groupId,
      start_time: options.startTime,
      end_time: options.endTime,
      metadata,
    };
    if (options.recurrence) body.recurrence = options.recurrence;

    const result = await this.request("POST", "/calendar-events", body);

    if (result.status !== 200) {
      return { success: false, eventId: "", message: `Create event failed: ${JSON.stringify(result.data)}` };
    }

    const eventId = (result.data.id as string) || "";
    return { success: true, eventId, message: `Event "${options.title}" created. ID: ${eventId}` };
  }

  /**
   * Edit a calendar event.
   */
  async editEvent(
    eventId: string,
    options: {
      groupId: string;
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      timezone?: string;
      coverImage?: string;
      recurrence?: { frequency: string; interval: number; days: number[] };
    }
  ): Promise<{ success: boolean; message: string }> {
    // First get the current event data
    const current = await this.request("GET", `/calendar-events/${eventId}`);
    if (current.status !== 200) {
      return { success: false, message: `Could not fetch event: ${JSON.stringify(current.data)}` };
    }

    const currentMeta = (current.data.metadata as Record<string, unknown>) || {};
    const metadata: Record<string, unknown> = {
      title: options.title || currentMeta.title,
      description: options.description !== undefined ? options.description : (currentMeta.description || ""),
      timezone: options.timezone || currentMeta.timezone || "America/New_York",
      reminder_disabled: currentMeta.reminder_disabled ?? 0,
      location: currentMeta.location || JSON.stringify({ location_type: 5, location_info: "" }),
      privacy: currentMeta.privacy || JSON.stringify({ privacy_type: 0 }),
      cover_image: options.coverImage || currentMeta.cover_image || "",
    };

    const body: Record<string, unknown> = {
      group_id: options.groupId,
      start_time: options.startTime || current.data.start_time || current.data.startTime,
      end_time: options.endTime || current.data.end_time || current.data.endTime,
      metadata,
      id: eventId,
    };

    // Use new recurrence if provided, otherwise preserve original
    if (options.recurrence) {
      body.recurrence = options.recurrence;
    } else if (current.data.recurrence) {
      body.recurrence = current.data.recurrence;
    }

    const result = await this.request("PUT", `/calendar-events/${eventId}`, body);

    if (result.status !== 200) {
      return { success: false, message: `Edit event failed: ${JSON.stringify(result.data)}` };
    }

    return { success: true, message: `Event ${eventId} updated successfully` };
  }

  /**
   * Delete a calendar event.
   */
  async deleteEvent(eventId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.request("DELETE", `/calendar-events/${eventId}`);
    if (result.status !== 200 && result.status !== 204) {
      return { success: false, message: `Delete event failed: ${JSON.stringify(result.data)}` };
    }
    return { success: true, message: `Event ${eventId} deleted successfully` };
  }

  /**
   * Fetch analytics data (async endpoint with token polling).
   */
  private async fetchAnalytics(
    groupId: string,
    endpoint: string
  ): Promise<Record<string, unknown>> {
    // Step 1: Request analytics (returns token)
    const initial = await this.request("GET", `/groups/${groupId}/${endpoint}`);
    if (initial.status !== 200) return {};

    const token = initial.data.token as string;
    if (!token) {
      // Data returned directly (admin-metrics)
      return initial.data;
    }

    // Step 2: Poll /wait until completed
    for (let i = 0; i < 10; i++) {
      const waitResult = await this.request("GET", `/wait?token=${token}`);
      const waitData = JSON.stringify(waitResult.data);
      if (waitData.includes("completed")) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Step 3: Fetch with token
    const result = await this.request(
      "GET",
      `/groups/${groupId}/${endpoint}${endpoint.includes("?") ? "&" : "?"}token=${token}`
    );
    return (result.data.data as Record<string, unknown>) || result.data;
  }

  /**
   * Get group analytics (overview, growth, metrics).
   */
  async getAnalytics(
    groupId: string
  ): Promise<{
    members: number;
    conversion: number;
    visitors: number;
    signups: number;
    mrr: number | null;
  }> {
    const [overview, growth] = await Promise.all([
      this.fetchAnalytics(groupId, "analytics-overview-v2"),
      this.fetchAnalytics(groupId, "analytics-growth-overview-v2"),
    ]);

    return {
      members: (overview.num_members as number) || 0,
      conversion: (overview.conversion as number) || 0,
      visitors: (growth.num_visitors as number) || 0,
      signups: (growth.num_signups as number) || 0,
      mrr: (growth.new_mrr as number) ?? null,
    };
  }

  /**
   * Create a community post via API.
   */
  async createPost(options: {
    groupId: string;
    title: string;
    content: string;
    labels: string;
  }): Promise<{ success: boolean; postId: string; message: string }> {
    const result = await this.request("POST", "/posts?follow=true", {
      post_type: "generic",
      group_id: options.groupId,
      metadata: {
        title: options.title,
        content: options.content,
        attachments: "",
        labels: options.labels,
        action: 0,
        video_ids: "",
      },
    });

    if (result.status !== 200) {
      return { success: false, postId: "", message: `Create post failed: ${JSON.stringify(result.data)}` };
    }

    const postId = (result.data.id as string) || "";
    return { success: true, postId, message: `Post "${options.title}" created. ID: ${postId}` };
  }

  /**
   * Update an existing post's title, content, or category.
   */
  async updatePost(
    postId: string,
    options: { title?: string; content?: string; labels?: string }
  ): Promise<{ success: boolean; message: string }> {
    const body: Record<string, unknown> = {};
    if (options.title) body.title = options.title;
    if (options.content) body.content = options.content;
    if (options.labels) body.labels = options.labels;

    const result = await this.request("POST", `/posts/${postId}/update`, body);
    if (result.status !== 200) {
      return { success: false, message: `Update post failed: ${JSON.stringify(result.data)}` };
    }
    return { success: true, message: `Post ${postId} updated successfully` };
  }

  /**
   * Delete a post by ID.
   */
  async deletePost(postId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.request("DELETE", `/posts/${postId}`);
    if (result.status !== 200 && result.status !== 204) {
      return { success: false, message: `Delete post failed: ${JSON.stringify(result.data)}` };
    }
    return { success: true, message: `Post ${postId} deleted successfully` };
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
