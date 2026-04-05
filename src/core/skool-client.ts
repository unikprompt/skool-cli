import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { BrowserManager } from "./browser-manager.js";
import { PageOps } from "./page-ops.js";
import { SkoolApi } from "./skool-api.js";
import { markdownToHtml, structuredContentToHtml } from "./html-generator.js";
import type {
  CreateCourseOptions,
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
  private lastGroupSlug = "";

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
    this.lastGroupSlug = groupSlug;

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

  /** Discover groupId and userId without entering a course */
  private async discoverGroupIds(
    groupSlug: string
  ): Promise<{ groupId: string; userId: string }> {
    if (this.cachedGroupId && this.cachedUserId) {
      return { groupId: this.cachedGroupId, userId: this.cachedUserId };
    }

    const page = await this.browser.getPage();
    await this.ops.gotoClassroom(groupSlug);
    await page.waitForTimeout(2000);

    // Get group_id from page assets
    const groupId = await page.evaluate(() => {
      const ogMatch = document.documentElement.innerHTML.match(
        /assets\.skool\.com\/f\/([a-f0-9]{32})/
      );
      return ogMatch ? ogMatch[1] : "";
    });

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

    this.cachedGroupId = groupId;
    this.cachedUserId = userId;
    this.lastGroupSlug = groupSlug;

    return { groupId, userId };
  }

  /**
   * Scan HTML for local image paths and upload them to Skool.
   * Replaces local paths with Skool CDN URLs.
   */
  private async uploadLocalImages(
    html: string,
    groupId: string
  ): Promise<string> {
    const imgRegex = /<img\s+[^>]*src="([^"]+)"[^>]*>/gi;
    let result = html;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      // Skip URLs (http/https/data)
      if (src.startsWith("http") || src.startsWith("data:")) continue;

      // Resolve local path
      const localPath = resolve(src);
      if (!existsSync(localPath)) continue;

      const upload = await this.api.uploadFile(localPath, groupId);
      if (upload && upload.readUrl) {
        result = result.replace(src, upload.readUrl);
      }
    }

    return result;
  }

  /** Create a new course in a Skool group */
  async createCourse(options: CreateCourseOptions): Promise<OperationResult> {
    const privacyMap: Record<string, number> = {
      open: 0,
      level: 1,
      buy: 2,
      time: 3,
      private: 4,
    };

    try {
      const { groupId, userId } = await this.discoverGroupIds(options.group);

      if (!groupId || !userId) {
        return { success: false, message: "Could not discover Skool IDs." };
      }

      // Upload cover image if provided
      let coverImage: string | undefined;
      let coverImageFile: string | undefined;
      if (options.coverImage) {
        const upload = await this.api.uploadFile(options.coverImage, groupId);
        if (upload) {
          coverImage = upload.readUrl;
          coverImageFile = upload.fileId;
        }
      }

      const result = await this.api.createCourse({
        groupId,
        userId,
        title: options.title,
        description: options.description,
        privacy: privacyMap[options.privacy || "open"] ?? 0,
        coverImage,
        coverImageFile,
      });

      return { success: result.success, message: result.message };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create course: ${(error as Error).message}`,
      };
    }
  }

  /** List all courses in a group */
  async listCourses(groupSlug: string): Promise<{
    success: boolean;
    message: string;
    courses: { id: string; title: string; description: string; privacy: number }[];
  }> {
    try {
      const page = await this.browser.getPage();
      await page.goto(`https://www.skool.com/${groupSlug}/classroom`);
      await page.waitForTimeout(3000);

      const courses = await page.evaluate(() => {
        const script = document.querySelector("script#__NEXT_DATA__");
        if (!script) return [];
        const data = JSON.parse(script.textContent || "{}");
        const allCourses = data?.props?.pageProps?.allCourses;
        if (!Array.isArray(allCourses)) return [];
        return allCourses.map((c: Record<string, unknown>) => {
          const meta = c.metadata as Record<string, unknown> || {};
          return {
            id: c.id as string,
            title: (meta.title as string) || "",
            description: (meta.desc as string) || "",
            privacy: (meta.privacy as number) || 0,
          };
        });
      });

      return {
        success: true,
        message: `Found ${courses.length} course(s)`,
        courses,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list courses: ${(error as Error).message}`,
        courses: [],
      };
    }
  }

  /** Edit a course's title, description, privacy, or cover image */
  async editCourse(options: {
    id: string;
    title?: string;
    description?: string;
    privacy?: "open" | "level" | "buy" | "time" | "private";
    coverImage?: string;
    group?: string;
  }): Promise<OperationResult> {
    const privacyMap: Record<string, number> = {
      open: 0, level: 1, buy: 2, time: 3, private: 4,
    };

    if (!options.title && !options.description && !options.privacy && !options.coverImage) {
      return { success: false, message: "Nothing to update. Provide --title, --description, --privacy, or --cover." };
    }

    try {
      const body: Record<string, unknown> = {};
      if (options.title) body.title = options.title;
      if (options.description !== undefined) body.desc = options.description;
      if (options.privacy) body.privacy = privacyMap[options.privacy] ?? 0;

      if (options.coverImage) {
        let groupId = this.cachedGroupId;
        if (!groupId && options.group) {
          const ids = await this.discoverGroupIds(options.group);
          groupId = ids.groupId;
        }
        if (groupId) {
          const upload = await this.api.uploadFile(options.coverImage, groupId);
          if (upload) {
            body.cover_image = upload.readUrl;
            body.cover_image_file = upload.fileId;
          }
        }
      }

      const result = await this.api.updateCourse(options.id, body);
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: `Failed to edit course: ${(error as Error).message}` };
    }
  }

  /** Move a course left or right */
  async moveCourse(courseId: string, direction: "left" | "right"): Promise<OperationResult> {
    try {
      const result = await this.api.moveCourse(courseId, direction);
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: `Failed to move course: ${(error as Error).message}` };
    }
  }

  /** Duplicate a course */
  async duplicateCourse(courseId: string): Promise<OperationResult> {
    try {
      const result = await this.api.duplicateCourse(courseId);
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: `Failed to duplicate course: ${(error as Error).message}` };
    }
  }

  /** Delete a course by ID */
  async deleteCourse(courseId: string): Promise<OperationResult> {
    return this.deleteLesson(courseId);
  }

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
   * Navigates to the course page and extracts folder data from __NEXT_DATA__.
   */
  private async findFolderByName(
    groupId: string,
    rootId: string,
    folderName: string
  ): Promise<string | null> {
    const page = await this.browser.getPage();

    // Navigate directly to the course page to get fresh __NEXT_DATA__
    const courseUrl = `https://www.skool.com/${this.lastGroupSlug || "x"}/classroom/${rootId}`;
    await page.goto(courseUrl);
    await page.waitForTimeout(3000);

    const folderId = await page.evaluate(
      ({ name }) => {
        const script = document.querySelector("script#__NEXT_DATA__");
        if (!script) return "";

        try {
          const data = JSON.parse(script.textContent || "{}");
          const course = data?.props?.pageProps?.course;
          if (!course?.children) return "";

          // Walk the children tree looking for folders (unitType: "set")
          for (const child of course.children) {
            const c = child.course || child;
            const title = c.metadata?.title || c.name || "";
            const unitType = c.unitType || c.unit_type || "";
            if (
              unitType === "set" &&
              title.toLowerCase() === name.toLowerCase()
            ) {
              return c.id;
            }
          }
        } catch {
          // ignore parse errors
        }
        return "";
      },
      { name: folderName }
    );

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

      // Upload local images if any
      html = await this.uploadLocalImages(html, groupId);

      // Create lesson via direct API call
      const result = await this.api.createPage({
        groupId,
        userId,
        parentId,
        rootId,
        title: options.title,
        content: html,
        videoUrl: options.videoUrl,
        resources: options.resources,
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

    if (!options.title && !html && !options.videoUrl && !options.resources) {
      return {
        success: false,
        message: "Nothing to update. Provide --title, --file, --html, --markdown, --video, or --resource.",
      };
    }

    try {
      // Upload local images if any
      if (html && this.cachedGroupId) {
        html = await this.uploadLocalImages(html, this.cachedGroupId);
      }

      const result = await this.api.updatePage(options.id, {
        title: options.title,
        content: html,
        videoUrl: options.videoUrl,
        resources: options.resources,
      });
      return { success: result.success, message: result.message };
    } catch (error) {
      return {
        success: false,
        message: `Failed to edit lesson: ${(error as Error).message}`,
      };
    }
  }

  /** Move a lesson to a different folder */
  async moveLesson(options: {
    id: string;
    targetFolderId?: string;
    targetFolder?: string;
    group?: string;
    course?: string;
  }): Promise<OperationResult> {
    let targetId = options.targetFolderId;

    if (!targetId && options.targetFolder && options.group) {
      const { groupId, rootId } = await this.discoverIds(
        options.group,
        options.course
      );
      if (!rootId) {
        return { success: false, message: "Could not discover course IDs." };
      }
      targetId = await this.findFolderByName(groupId, rootId, options.targetFolder) || undefined;
      if (!targetId) {
        return {
          success: false,
          message: `Folder "${options.targetFolder}" not found. Use --target-folder-id with the ID directly.`,
        };
      }
    }

    if (!targetId) {
      return {
        success: false,
        message: "No target specified. Use --target-folder or --target-folder-id.",
      };
    }

    try {
      const result = await this.api.movePage(options.id, targetId);
      return { success: result.success, message: result.message };
    } catch (error) {
      return {
        success: false,
        message: `Failed to move lesson: ${(error as Error).message}`,
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
  /** Edit an existing post */
  async editPost(options: {
    id: string;
    title?: string;
    body?: string;
    category?: string;
  }): Promise<OperationResult> {
    if (!options.title && !options.body && !options.category) {
      return { success: false, message: "Nothing to update. Provide --title, --body, or --category." };
    }
    try {
      // If category name provided, resolve to ID
      let labels: string | undefined;
      if (options.category) {
        // Category ID will need to be resolved - for now pass as-is
        // Users can get category IDs from get-categories --json
        labels = options.category;
      }
      const result = await this.api.updatePost(options.id, {
        title: options.title,
        content: options.body,
        labels,
      });
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: `Failed to edit post: ${(error as Error).message}` };
    }
  }

  /** Delete a post by ID */
  async deletePost(postId: string): Promise<OperationResult> {
    try {
      const result = await this.api.deletePost(postId);
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: `Failed to delete post: ${(error as Error).message}` };
    }
  }

  /** Create a calendar event */
  async createEvent(options: {
    group: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    timezone?: string;
    coverImage?: string;
  }): Promise<OperationResult> {
    try {
      const { groupId } = await this.discoverGroupIds(options.group);
      if (!groupId) {
        return { success: false, message: "Could not discover group ID." };
      }

      let coverUrl: string | undefined;
      if (options.coverImage) {
        const upload = await this.api.uploadFile(options.coverImage, groupId);
        if (upload) coverUrl = upload.readUrl;
      }

      const result = await this.api.createEvent({
        groupId,
        title: options.title,
        description: options.description,
        startTime: options.startTime,
        endTime: options.endTime,
        timezone: options.timezone,
        coverImage: coverUrl,
      });

      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: `Failed to create event: ${(error as Error).message}` };
    }
  }

  /** List calendar events */
  async listEvents(groupSlug: string): Promise<{
    success: boolean;
    message: string;
    events: { id: string; title: string; startTime: string; endTime: string }[];
  }> {
    try {
      const page = await this.browser.getPage();
      await page.goto(`https://www.skool.com/${groupSlug}/calendar`);
      await page.waitForTimeout(3000);

      const events = await page.evaluate(() => {
        const script = document.querySelector("script#__NEXT_DATA__");
        if (!script) return [];
        const d = JSON.parse(script.textContent || "{}");
        const evts = d?.props?.pageProps?.events || [];
        return evts.map((e: Record<string, unknown>) => ({
          id: (e.id as string) || "",
          title: ((e.metadata as Record<string, unknown>)?.title as string) || "",
          startTime: (e.startTime as string) || (e.start_time as string) || "",
          endTime: (e.endTime as string) || (e.end_time as string) || "",
        }));
      });

      return {
        success: true,
        message: `${events.length} event(s) found`,
        events,
      };
    } catch (error) {
      return { success: false, message: `Failed to list events: ${(error as Error).message}`, events: [] };
    }
  }

  /** Delete a calendar event */
  async deleteEvent(eventId: string): Promise<OperationResult> {
    try {
      const result = await this.api.deleteEvent(eventId);
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: `Failed to delete event: ${(error as Error).message}` };
    }
  }

  /** Get leaderboard rankings */
  async getLeaderboard(
    groupSlug: string,
    period: "all" | "30d" | "7d" = "all"
  ): Promise<{
    success: boolean;
    message: string;
    users: { name: string; points: number; level: number }[];
    levels: { number: number; name: string; percentOfMembers: number }[];
  }> {
    try {
      const page = await this.browser.getPage();
      await page.goto(`https://www.skool.com/${groupSlug}/-/leaderboards`);
      await page.waitForTimeout(3000);

      const data = await page.evaluate(
        ({ p }) => {
          const script = document.querySelector("script#__NEXT_DATA__");
          if (!script) return { users: [], levels: [] };
          const d = JSON.parse(script.textContent || "{}");
          const pp = d?.props?.pageProps || {};

          const periodMap: Record<string, string> = {
            all: "allTime",
            "30d": "past30Days",
            "7d": "past7Days",
          };
          const key = periodMap[p] || "allTime";
          const raw = (pp as Record<string, unknown>)[key] as Record<string, unknown> | undefined;
          const users = ((raw?.users as Array<Record<string, unknown>>) || []).map((u) => ({
            name: (u.name as string) || "",
            points: ((u.metadata as Record<string, unknown>)?.points as number) || 0,
            level: ((u.metadata as Record<string, unknown>)?.level as number) || 1,
          }));
          const levels = (pp.groupLevels as Array<Record<string, unknown>>) || [];
          return {
            users,
            levels: levels.map((l) => ({
              number: (l.number as number) || 0,
              name: (l.name as string) || "",
              percentOfMembers: (l.percentOfMembers as number) || 0,
            })),
          };
        },
        { p: period }
      );

      return {
        success: true,
        message: `${data.users.length} user(s) in leaderboard`,
        users: data.users,
        levels: data.levels,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get leaderboard: ${(error as Error).message}`,
        users: [],
        levels: [],
      };
    }
  }

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
