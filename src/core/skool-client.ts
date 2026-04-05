import { readFileSync } from "node:fs";
import { BrowserManager } from "./browser-manager.js";
import { PageOps } from "./page-ops.js";
import { SkoolApi } from "./skool-api.js";
import { markdownToHtml, structuredContentToHtml } from "./html-generator.js";
import type {
  CreateLessonOptions,
  EditLessonOptions,
  CreateFolderOptions,
  CreatePostOptions,
  OperationResult,
  SkoolPost,
  SkoolMember,
} from "./types.js";

/**
 * High-level Skool client.
 * This is the main API for both CLI commands and programmatic usage.
 */
export class SkoolClient {
  private browser: BrowserManager;
  private ops: PageOps;
  private api: SkoolApi;

  // Cached IDs for API calls
  private cachedGroupId = "";
  private cachedUserId = "";
  private cachedRootId = "";

  constructor() {
    this.browser = new BrowserManager();
    this.ops = new PageOps(this.browser);
    this.api = new SkoolApi(this.browser);
  }

  /** Discover group_id, user_id, root_id for API calls */
  private async discoverIds(
    groupSlug: string,
    courseName?: string
  ): Promise<{ groupId: string; userId: string; rootId: string }> {
    // Return cached if available
    if (this.cachedGroupId && this.cachedUserId && this.cachedRootId) {
      return {
        groupId: this.cachedGroupId,
        userId: this.cachedUserId,
        rootId: this.cachedRootId,
      };
    }

    const page = await this.browser.getPage();

    // Navigate to classroom
    await this.ops.gotoClassroom(groupSlug);

    // Enter course
    if (courseName) {
      await page.getByText(courseName, { exact: false }).first().click();
    } else {
      const courseLink = page.locator('a[href*="/classroom/"]').first();
      if ((await courseLink.count()) > 0) await courseLink.click();
    }
    await page.waitForTimeout(3000);

    // Get group_id from telemetry/page
    let groupId = "";
    page.on("request", (req) => {
      const body = req.postData();
      if (body) {
        const gm = body.match(/"group_id"\s*:\s*"([a-f0-9]{32})"/);
        if (gm && !groupId) groupId = gm[1];
      }
    });

    // Get group_id from page assets if not captured
    if (!groupId) {
      groupId = await page.evaluate(() => {
        const str = document.documentElement.innerHTML;
        const m = str.match(/[a-f0-9]{32}/);
        // Look for the specific pattern in og:image URLs
        const ogMatch = str.match(/assets\.skool\.com\/f\/([a-f0-9]{32})/);
        return ogMatch ? ogMatch[1] : (m ? m[0] : "");
      });
    }

    // Get user_id from JWT auth_token cookie
    let userId = "";
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name === "auth_token");
    if (authCookie) {
      try {
        const payload = JSON.parse(
          Buffer.from(authCookie.value.split(".")[1], "base64").toString()
        );
        userId = payload.user_id || payload.sub || payload.id || "";
      } catch { /* ignore */ }
    }

    // Get root_id by intercepting the POST to api2.skool.com when doing "Add page"
    // Then DELETE the unwanted "New page" that gets created
    let rootId = "";
    let tempPageId = "";

    const rootIdPromise = new Promise<{ rootId: string; pageId: string }>((resolve) => {
      const timeout = setTimeout(() => resolve({ rootId: "", pageId: "" }), 15000);
      page.on("response", async (res) => {
        if (res.url().includes("api2.skool.com/courses") && res.request().method() === "POST") {
          try {
            const data = (await res.json()) as Record<string, unknown>;
            if (data.root_id && data.id) {
              clearTimeout(timeout);
              resolve({
                rootId: data.root_id as string,
                pageId: data.id as string,
              });
            }
          } catch { /* ignore */ }
        }
      });
    });

    // Trigger "Add page" to get root_id
    const courseTopArea = page.locator('div[class*="CourseMenuTop"]').first();
    await courseTopArea.hover();
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const topArea = document.querySelector('div[class*="CourseMenuTop"]');
      if (!topArea) return;
      topArea.querySelectorAll("div, button, span, svg").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const text = el.textContent?.trim() || "";
        if (rect.width > 10 && rect.width < 50 && rect.height > 10 && rect.height < 50 && text.length < 4) {
          el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        }
      });
    });
    await page.waitForTimeout(800);

    try {
      await page.getByText("Add page", { exact: true }).click({ timeout: 5000 });
    } catch {
      await page.getByText("Add page", { exact: true }).click({ force: true, timeout: 5000 });
    }

    const captured = await rootIdPromise;
    rootId = captured.rootId;
    tempPageId = captured.pageId;

    // Delete the temporary "New page" that was created for discovery
    if (tempPageId) {
      await this.api.deletePage(tempPageId);
    }

    // Cache for future calls
    this.cachedGroupId = groupId;
    this.cachedUserId = userId;
    this.cachedRootId = rootId;

    return { groupId, userId, rootId };
  }

  // ----------------------------------------------------------
  // Auth
  // ----------------------------------------------------------

  /** Login to Skool with email and password */
  async login(email: string, password: string): Promise<OperationResult> {
    const success = await this.ops.login(email, password);
    return {
      success,
      message: success
        ? "Logged in successfully. Session cached for future use."
        : "Login failed. Check your email and password.",
    };
  }

  /** Check if the current session is valid */
  async checkSession(groupSlug: string): Promise<OperationResult> {
    await this.ops.gotoCommunity(groupSlug);
    const authenticated = await this.ops.isAuthenticated();
    return {
      success: authenticated,
      message: authenticated
        ? "Session is active."
        : "Session expired. Run: skool login",
    };
  }

  // ----------------------------------------------------------
  // Classroom
  // ----------------------------------------------------------

  /** Create a new folder (module) in a Skool classroom course */
  async createFolder(options: CreateFolderOptions): Promise<OperationResult> {
    try {
      const { groupId, userId, rootId } = await this.discoverIds(
        options.group,
        options.course
      );

      if (!groupId || !rootId) {
        return { success: false, message: "Could not discover Skool IDs." };
      }

      const result = await this.api.createFolder({
        groupId,
        parentId: rootId,
        rootId,
        title: options.title,
      });

      return { success: result.success, message: result.message };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create folder: ${(error as Error).message}`,
      };
    }
  }

  /** Find a folder by name and return its ID.
   * Extracts folder names + IDs from the sidebar DOM via Playwright.
   */
  private async findFolderByName(
    groupId: string,
    rootId: string,
    folderName: string
  ): Promise<string | null> {
    // First try: API-based lookup
    const items = await this.api.listCourseItems(groupId, rootId);
    for (const item of items) {
      const meta = item.metadata as Record<string, unknown> | undefined;
      const title = (meta?.title as string) || "";
      const unitType = (item.unit_type as string) || "";
      if (
        unitType === "set" &&
        title.toLowerCase() === folderName.toLowerCase()
      ) {
        return item.id as string;
      }
    }

    // Second try: extract from sidebar links via Playwright
    // Folder links in the sidebar contain the folder ID in the URL hash
    const page = await this.browser.getPage();
    const folderId = await page.evaluate((name: string) => {
      // Folders in sidebar are MenuItemTitle elements
      // Their parent MenuItemWrapper contains a link or data attribute with the ID
      // When you click a folder, the URL changes to include ?md=<folder_first_child_id>
      // But we can also find the folder by matching the name in the sidebar
      // and looking for nearby elements with ID-like attributes

      // Alternative: look at all links in the sidebar that contain the course path
      const links = document.querySelectorAll('a[href*="/classroom/"]');
      let found = "";
      links.forEach((link) => {
        const href = link.getAttribute("href") || "";
        const text = link.textContent?.trim() || "";
        // Links inside folders have ?md= parameter with the page ID
        // We need the folder ID, which is the parent_id of pages inside it
        // This approach won't give us the folder ID directly
      });

      // Better approach: check if Skool stores course data in React state
      // Look for __NEXT_DATA__ or similar
      const scripts = document.querySelectorAll("script#__NEXT_DATA__");
      if (scripts.length > 0) {
        try {
          const data = JSON.parse(scripts[0].textContent || "{}");
          const str = JSON.stringify(data);
          // Find all "set" type items (folders) by parsing the full state
          // Pattern: "unit_type":"set" with matching "title":"<name>"
          const regex = new RegExp(
            `"id":"([a-f0-9]{32})"[^}]*"unit_type":"set"[^}]*"title":"${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
            "i"
          );
          const match = str.match(regex);
          if (match) return match[1];

          // Try reverse order (title before id)
          const regex2 = new RegExp(
            `"title":"${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^}]*"unit_type":"set"[^}]*"id":"([a-f0-9]{32})"`,
            "i"
          );
          const match2 = str.match(regex2);
          if (match2) return match2[1];
        } catch {
          // ignore parse errors
        }
      }

      return found;
    }, folderName);

    return folderId || null;
  }

  /** Create a new lesson in a Skool classroom module */
  async createLesson(options: CreateLessonOptions): Promise<OperationResult> {
    // Resolve HTML content
    let html: string;

    if (options.htmlContent) {
      html = options.htmlContent;
    } else if (options.markdownContent) {
      html = markdownToHtml(options.markdownContent);
    } else if (options.filePath) {
      const content = readFileSync(options.filePath, "utf-8");

      if (options.filePath.endsWith(".json")) {
        const parsed = JSON.parse(content);
        const sc = parsed.skool_class || parsed;
        html = structuredContentToHtml(sc);
      } else if (
        options.filePath.endsWith(".html") ||
        options.filePath.endsWith(".htm")
      ) {
        html = content;
      } else {
        html = markdownToHtml(content);
      }
    } else {
      return {
        success: false,
        message: "No content provided. Use --file, --html, or provide markdown content.",
      };
    }

    try {
      // Discover IDs via browser navigation
      const { groupId, userId, rootId } = await this.discoverIds(
        options.group,
        options.course
      );

      if (!groupId || !userId || !rootId) {
        return {
          success: false,
          message: "Could not discover Skool IDs. Check your auth session.",
        };
      }

      // Resolve parent: if folder specified, find its ID
      let parentId = rootId;
      if (options.folderId) {
        // Direct folder ID provided
        parentId = options.folderId;
      } else if (options.folder) {
        const folderId = await this.findFolderByName(groupId, rootId, options.folder);
        if (!folderId) {
          return {
            success: false,
            message: `Folder "${options.folder}" not found. Try --folder-id with the folder ID directly.`,
          };
        }
        parentId = folderId;
      }

      // Create lesson via direct API call
      const result = await this.api.createPage({
        groupId,
        userId,
        parentId,
        rootId,
        title: options.title,
        content: html,
      });

      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create lesson: ${(error as Error).message}`,
      };
    }
  }

  /** Edit an existing lesson's title and/or content */
  async editLesson(options: EditLessonOptions): Promise<OperationResult> {
    let html: string | undefined;

    if (options.htmlContent) {
      html = options.htmlContent;
    } else if (options.markdownContent) {
      html = markdownToHtml(options.markdownContent);
    } else if (options.filePath) {
      const content = readFileSync(options.filePath, "utf-8");

      if (options.filePath.endsWith(".json")) {
        const parsed = JSON.parse(content);
        const sc = parsed.skool_class || parsed;
        html = structuredContentToHtml(sc);
      } else if (
        options.filePath.endsWith(".html") ||
        options.filePath.endsWith(".htm")
      ) {
        html = content;
      } else {
        html = markdownToHtml(content);
      }
    }

    if (!options.title && !html) {
      return {
        success: false,
        message: "Nothing to update. Provide --title, --file, --html, or --markdown.",
      };
    }

    try {
      const result = await this.api.updatePage(options.id, options.title, html);
      return { success: result.success, message: result.message };
    } catch (error) {
      return {
        success: false,
        message: `Failed to edit lesson: ${(error as Error).message}`,
      };
    }
  }

  /** List all lessons and folders in a course (from sidebar DOM) */
  async listLessons(
    groupSlug: string,
    courseName?: string
  ): Promise<{
    success: boolean;
    message: string;
    items: Array<{
      name: string;
      type: "folder" | "lesson";
      children?: Array<{ name: string }>;
    }>;
  }> {
    try {
      const page = await this.browser.getPage();

      // Navigate to classroom and enter course
      await this.ops.gotoClassroom(groupSlug);
      if (courseName) {
        await page.getByText(courseName, { exact: false }).first().click();
      } else {
        const link = page.locator('a[href*="/classroom/"]').first();
        if ((await link.count()) > 0) await link.click();
      }
      await page.waitForTimeout(3000);

      // Extract structure from sidebar DOM
      // Folders have class MenuItemTitle with a chevron (expandable)
      // Lessons are links inside expanded folders or at course root
      const items = await page.evaluate(() => {
        const result: Array<{
          name: string;
          type: "folder" | "lesson";
          children?: Array<{ name: string }>;
        }> = [];

        // All items in the sidebar menu
        const wrappers = document.querySelectorAll(
          'div[class*="MenuItemWrapper"]'
        );

        let currentFolder: {
          name: string;
          type: "folder";
          children: Array<{ name: string }>;
        } | null = null;

        wrappers.forEach((wrapper) => {
          const titleEl = wrapper.querySelector(
            'div[class*="MenuItemTitle"]'
          );
          const name = titleEl?.textContent?.trim() || "";
          if (!name) return;

          // Check if this is a folder (has SetMenuItem children or is a "set" type)
          // Folders have a chevron (expand/collapse) indicator
          const hasChevron =
            wrapper.querySelector('svg, [class*="Chevron"], [class*="arrow"]') !== null;
          const setItems = wrapper.querySelector(
            'div[class*="SetMenuItem"]'
          );

          // A folder is an item that contains other items
          // In the DOM: folders are top-level MenuItemWrapper with child SetMenuItem items
          if (setItems || wrapper.classList.toString().includes("SetMenuItem") === false) {
            // Check if this item has children (is expanded with lessons underneath)
            const childContainer = wrapper.querySelector(
              'div[class*="SetMenuItem"]'
            );
            if (childContainer) {
              // This is a folder with visible children
              currentFolder = { name, type: "folder", children: [] };
              // Children are links inside this wrapper
              const childLinks = wrapper.querySelectorAll(
                'a[href*="/classroom/"]'
              );
              childLinks.forEach((link) => {
                const childName = link.textContent?.trim() || "";
                if (childName && childName !== name) {
                  currentFolder!.children.push({ name: childName });
                }
              });
              result.push(currentFolder);
              currentFolder = null;
            } else {
              // Standalone item (could be a collapsed folder or a root-level lesson)
              // Check if it has a link (lessons have links, folders don't always)
              const link = wrapper.querySelector('a[href*="/classroom/"]');
              if (link) {
                result.push({ name, type: "lesson" });
              } else {
                // Collapsed folder (no children visible)
                result.push({ name, type: "folder", children: [] });
              }
            }
          }
        });

        return result;
      });

      return { success: true, message: `Found ${items.length} items`, items };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list lessons: ${(error as Error).message}`,
        items: [],
      };
    }
  }

  /** Delete a lesson or folder by ID */
  async deleteLesson(pageId: string): Promise<OperationResult> {
    try {
      const success = await this.api.deletePage(pageId);
      return {
        success,
        message: success
          ? `Deleted successfully. ID: ${pageId}`
          : `Delete failed for ID: ${pageId}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete: ${(error as Error).message}`,
      };
    }
  }

  // ----------------------------------------------------------
  // Community
  // ----------------------------------------------------------

  /** Create a community post */
  async createPost(options: CreatePostOptions): Promise<OperationResult> {
    // Check auth first
    await this.ops.gotoCommunity(options.group);
    const authenticated = await this.ops.isAuthenticated();
    if (!authenticated) {
      return {
        success: false,
        message: "Not authenticated. Run: skool login",
      };
    }

    try {
      await this.ops.createCommunityPost(
        options.group,
        options.title,
        options.body,
        options.category
      );
      return {
        success: true,
        message: `Post "${options.title}" created successfully.`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create post: ${(error as Error).message}`,
      };
    }
  }

  /** Get posts from a community */
  async getPosts(
    groupSlug: string
  ): Promise<{ success: boolean; posts: SkoolPost[] }> {
    try {
      const raw = await this.ops.extractPosts(groupSlug);
      const posts: SkoolPost[] = raw.map((p) => ({
        title: p.title,
        author: p.author,
        category: p.category,
        likes: 0,
        comments: 0,
        preview: p.preview,
        url: p.url,
      }));
      return { success: true, posts };
    } catch (error) {
      return { success: false, posts: [] };
    }
  }

  /** Get categories from a community */
  async getCategories(
    groupSlug: string
  ): Promise<{ success: boolean; categories: string[] }> {
    try {
      const categories = await this.ops.extractCategories(groupSlug);
      return { success: true, categories };
    } catch {
      return { success: false, categories: [] };
    }
  }

  // ----------------------------------------------------------
  // Members
  // ----------------------------------------------------------

  /** Get members from a community */
  async getMembers(
    groupSlug: string,
    search?: string
  ): Promise<{ success: boolean; members: SkoolMember[] }> {
    try {
      const raw = await this.ops.extractMembers(groupSlug, search);
      const members: SkoolMember[] = raw.map((m) => ({
        name: m.name,
        level: m.level,
        points: 0,
        contributions: m.contributions,
      }));
      return { success: true, members };
    } catch {
      return { success: false, members: [] };
    }
  }

  // ----------------------------------------------------------
  // Lifecycle
  // ----------------------------------------------------------

  /** Close the browser and cleanup */
  async close(): Promise<void> {
    await this.browser.close();
  }
}

// Re-export types for programmatic API users
export type {
  CreateLessonOptions,
  CreatePostOptions,
  OperationResult,
  SkoolPost,
  SkoolMember,
} from "./types.js";
