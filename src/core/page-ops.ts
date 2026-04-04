import type { Page, Locator } from "playwright";
import { BrowserManager } from "./browser-manager.js";
import {
  SKOOL_BASE_URL,
  SPA_NAV_DELAY,
  MAX_TITLE_LENGTH,
  DEFAULT_TIMEOUT,
} from "./config.js";

/**
 * Low-level page operations for Skool automation.
 *
 * Encapsulates all 6 production workarounds:
 * 1. SAVE disabled after HTML injection -> space+backspace dirty trigger
 * 2. Dropdown overlay blocks clicks -> pointerEvents:none fix
 * 3. Volatile refs -> N/A with Playwright native locators
 * 4. SPA timing -> wait after navigation
 * 5. HTML conversion -> handled by html-generator
 * 6. 50-char title limit -> auto-truncate
 */
export class PageOps {
  constructor(private browser: BrowserManager) {}

  /** Get the current page */
  private async page(): Promise<Page> {
    return this.browser.getPage();
  }

  // ----------------------------------------------------------
  // Navigation
  // ----------------------------------------------------------

  /** Navigate to a Skool URL with SPA delay (workaround #4) */
  async goto(path: string): Promise<void> {
    const page = await this.page();
    const url = path.startsWith("http") ? path : `${SKOOL_BASE_URL}/${path}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(SPA_NAV_DELAY);
  }

  /** Navigate to a group's community page */
  async gotoCommunity(groupSlug: string): Promise<void> {
    await this.goto(groupSlug);
  }

  /** Navigate to a group's classroom page */
  async gotoClassroom(groupSlug: string): Promise<void> {
    await this.goto(`${groupSlug}/classroom`);
  }

  /** Navigate to a group's members page */
  async gotoMembers(groupSlug: string): Promise<void> {
    await this.goto(`${groupSlug}/members`);
  }

  // ----------------------------------------------------------
  // Auth detection
  // ----------------------------------------------------------

  /** Check if user is authenticated on the current page */
  async isAuthenticated(): Promise<boolean> {
    const page = await this.page();
    const content = await page.content();

    // If we see login/signup prompts, we're not authenticated
    const unauthIndicators = [
      'href="/login"',
      "Log in",
      "Sign in",
      "Sign up",
      "Create your free account",
    ];

    for (const indicator of unauthIndicators) {
      if (content.includes(indicator)) {
        // Could be a false positive on a public page -- check more carefully
        const loginButton = page.locator(
          'a[href="/login"], button:has-text("Log in"), button:has-text("Sign in")'
        );
        if ((await loginButton.count()) > 0) {
          return false;
        }
      }
    }

    return true;
  }

  // ----------------------------------------------------------
  // Login
  // ----------------------------------------------------------

  /** Perform login with email and password */
  async login(email: string, password: string): Promise<boolean> {
    const page = await this.page();

    await this.goto("login");

    // Fill email
    const emailInput = page.locator(
      'input[name="email"], input[type="email"]'
    );
    await emailInput.first().fill(email);

    // Fill password
    const passwordInput = page.locator(
      'input[name="password"], input[type="password"]'
    );
    await passwordInput.first().fill(password);

    // Submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.first().click();

    // Wait for navigation away from login page
    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: DEFAULT_TIMEOUT,
      });
      await page.waitForTimeout(3000);

      // Save auth state to disk so it persists across CLI invocations
      await this.browser.saveAuthState();

      return true;
    } catch {
      return false;
    }
  }

  // ----------------------------------------------------------
  // Click helpers (workaround #2: dropdown overlay)
  // ----------------------------------------------------------

  /** Remove all known overlays that block pointer events */
  async clearOverlays(): Promise<void> {
    const page = await this.page();
    await page.evaluate(() => {
      const selectors = [
        '[class*="DropdownBackground"]',
        '[class*="InputBackdrop"]',
        '[class*="Backdrop"]',
        '[class*="Overlay"]',
      ];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          (el as HTMLElement).style.pointerEvents = "none";
        });
      });
    });
  }

  /** Click a locator, fixing overlays if needed */
  async safeClick(locator: Locator): Promise<void> {
    const page = await this.page();

    try {
      await locator.click({ timeout: 5000 });
    } catch {
      // Workaround: remove all known overlays blocking clicks
      await page.evaluate(() => {
        const selectors = [
          '[class*="DropdownBackground"]',
          '[class*="dropdown-background"]',
          '[class*="InputBackdrop"]',
          '[class*="Backdrop"]',
        ];
        selectors.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => {
            (el as HTMLElement).style.pointerEvents = "none";
          });
        });
      });
      await locator.click({ timeout: 10000 });
    }
  }

  // ----------------------------------------------------------
  // Title filling (workaround #6: 50-char limit)
  // ----------------------------------------------------------

  /** Fill a title field, truncating to MAX_TITLE_LENGTH */
  async fillTitle(locator: Locator, title: string): Promise<string> {
    const truncated =
      title.length > MAX_TITLE_LENGTH
        ? title.slice(0, MAX_TITLE_LENGTH - 3) + "..."
        : title;

    await locator.fill(truncated);
    return truncated;
  }

  // ----------------------------------------------------------
  // TipTap HTML injection (workaround #1: dirty trigger)
  // ----------------------------------------------------------

  /**
   * Inject HTML content into the TipTap editor.
   * Includes the space+backspace dirty trigger so SAVE becomes enabled.
   */
  async injectTipTapContent(html: string): Promise<boolean> {
    const page = await this.page();

    // Click into the body area first to ensure it's focused
    // The body editor is the TipTap ProseMirror element (not the title)
    const bodyEditor = page.locator('div.tiptap.ProseMirror, div[class*="skool-editor"], div.ProseMirror').first();
    if ((await bodyEditor.count()) > 0) {
      await bodyEditor.click();
      await page.waitForTimeout(300);
    }

    const result = await page.evaluate((htmlContent: string) => {
      // Try multiple selectors for the TipTap editor (body, not title)
      const selectors = [
        'div.tiptap.ProseMirror',
        'div[class*="skool-editor"]',
        'div.ProseMirror[contenteditable]',
        '[contenteditable="true"]',
      ];

      let ce: HTMLElement | null = null;
      for (const sel of selectors) {
        const candidates = document.querySelectorAll(sel);
        // If multiple, pick the last one (body is usually after title)
        if (candidates.length > 0) {
          ce = candidates[candidates.length - 1] as HTMLElement;
          break;
        }
      }

      if (!ce) return { ok: false, error: "No contenteditable element found" };

      // Access TipTap editor instance
      const editor = (ce as unknown as { editor?: { commands: { focus: () => void; setContent: (html: string, emit: boolean) => void }; getHTML: () => string } }).editor;
      if (!editor)
        return { ok: false, error: "No TipTap editor instance found on element: " + ce.className };

      try {
        editor.commands.focus();
        editor.commands.setContent(htmlContent, true);
        return { ok: true, length: editor.getHTML().length };
      } catch (e) {
        return {
          ok: false,
          error: `setContent failed: ${(e as Error).message}`,
        };
      }
    }, html);

    if (!result.ok) {
      throw new Error(
        `TipTap injection failed: ${(result as { ok: false; error: string }).error}`
      );
    }

    // Workaround #1: trigger dirty state so SAVE button becomes enabled
    const editor = page.locator("[contenteditable=true]").first();
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" ");
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(1000);

    return true;
  }

  // ----------------------------------------------------------
  // Save and verify
  // ----------------------------------------------------------

  /** Click SAVE and verify it completes (button becomes disabled) */
  async clickSaveAndVerify(): Promise<boolean> {
    const page = await this.page();
    const saveBtn = page.getByRole("button", { name: "SAVE" });

    // Ensure SAVE is enabled before clicking
    const isDisabled = await saveBtn.getAttribute("disabled");
    if (isDisabled !== null) {
      // Already saved / nothing to save
      return true;
    }

    await this.safeClick(saveBtn);

    // Wait for SAVE to become disabled (= saved successfully)
    try {
      await saveBtn.waitFor({ state: "visible", timeout: 10000 });
      // Poll for disabled state
      for (let i = 0; i < 20; i++) {
        const disabled = await saveBtn.getAttribute("disabled");
        if (disabled !== null) return true;
        await page.waitForTimeout(500);
      }
      return false;
    } catch {
      return false;
    }
  }

  // ----------------------------------------------------------
  // Community post operations
  // ----------------------------------------------------------

  /** Create a community post */
  async createCommunityPost(
    groupSlug: string,
    title: string,
    body: string,
    category?: string
  ): Promise<boolean> {
    const page = await this.page();

    await this.gotoCommunity(groupSlug);

    // Click "Write something" area to open post form
    const postTrigger = page.getByText("Write something");
    await this.safeClick(postTrigger.first());
    await page.waitForTimeout(1500);

    // Fill title
    const titleInput = page.locator('input[placeholder="Title"]');
    await titleInput.fill(title);

    // Fill body via TipTap editor (div.tiptap.ProseMirror.skool-editor)
    const bodyEditor = page.locator("div.tiptap.ProseMirror.skool-editor");
    await bodyEditor.click();
    await bodyEditor.fill(body);

    // Select category if provided
    if (category) {
      await this.clearOverlays();

      const categoryBtn = page.getByText("Select a category");
      await categoryBtn.click({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Clear overlays again after dropdown opens
      await this.clearOverlays();

      // Click the category option via JS to bypass any remaining overlays
      const clicked = await page.evaluate((cat) => {
        let found = false;
        // Find elements with the category text inside a dropdown
        document.querySelectorAll('[class*="Dropdown"] *').forEach((el) => {
          if (!found && el.textContent?.trim() === cat && el.children.length === 0) {
            (el as HTMLElement).click();
            found = true;
          }
        });
        if (found) return true;
        // Fallback: find by GroupFeedLinkLabel class (the dropdown option)
        document.querySelectorAll('[class*="GroupFeedLinkLabel"]').forEach((el) => {
          if (!found && el.textContent?.trim() === cat) {
            (el as HTMLElement).click();
            found = true;
          }
        });
        return found;
      }, category);

      if (!clicked) {
        throw new Error(`Category "${category}" not found in dropdown`);
      }
      await page.waitForTimeout(500);
    }

    // Click Post button (the submit button with SubmitButtonWrapper class)
    const postBtn = page.locator('button[class*="SubmitButtonWrapper"]');
    await this.safeClick(postBtn.first());
    await page.waitForTimeout(3000);

    return true;
  }

  // ----------------------------------------------------------
  // Classroom lesson operations
  // ----------------------------------------------------------

  /**
   * Create a new lesson in a classroom module.
   *
   * Flow: enter course → "..." menu → "Add page" → click pencil → fill title → inject HTML → save
   */
  async createLesson(
    groupSlug: string,
    moduleName: string,
    title: string,
    html: string,
    courseName?: string
  ): Promise<boolean> {
    const page = await this.page();

    // Step 1: Navigate to classroom and enter course
    await this.gotoClassroom(groupSlug);
    if (courseName) {
      await this.safeClick(page.getByText(courseName, { exact: false }).first());
    } else {
      const courseLink = page.locator('a[href*="/classroom/"]').first();
      if ((await courseLink.count()) > 0) await courseLink.click();
    }
    await page.waitForTimeout(SPA_NAV_DELAY);

    // Step 2: Open "..." menu and click "Add page"
    const courseTopArea = page.locator('div[class*="CourseMenuTop"]').first();
    await courseTopArea.hover();
    await page.waitForTimeout(500);

    // Click "..." via JS (needed because it's an SVG icon)
    await page.evaluate(() => {
      const topArea = document.querySelector('div[class*="CourseMenuTop"]');
      if (!topArea) return;
      topArea.querySelectorAll('div, button, span, svg').forEach((el) => {
        const rect = el.getBoundingClientRect();
        const text = el.textContent?.trim() || "";
        if (rect.width > 10 && rect.width < 50 && rect.height > 10 && rect.height < 50 && text.length < 4) {
          el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        }
      });
    });
    await page.waitForTimeout(800);

    // Click "Add page" from dropdown
    try {
      await page.getByText("Add page", { exact: true }).click({ timeout: 5000 });
    } catch {
      await this.clearOverlays();
      await page.getByText("Add page", { exact: true }).click({ force: true, timeout: 5000 });
    }
    await page.waitForTimeout(3000);

    // Step 3: Click the pencil (edit) icon using REAL Playwright click
    // The pencil is the last SVG inside ModuleTitleRow in the content panel
    const titleRow = page.locator('div[class*="ModuleTitleRow"]').first();
    const pencilSvg = titleRow.locator("svg").last();

    try {
      await pencilSvg.click({ timeout: 5000 });
    } catch {
      // Fallback: click by coordinates near the right edge of the title row
      const box = await titleRow.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width - 25, box.y + box.height / 2);
      }
    }
    await page.waitForTimeout(2000);

    // Verify edit mode (SAVE button visible)
    const inEditMode = (await page.locator('button:has-text("SAVE")').count()) > 0;
    if (!inEditMode) {
      throw new Error("Could not enter edit mode. Try running with SKOOL_CLI_HEADLESS=false to debug.");
    }

    // Step 4: Fill title + inject content
    // In edit mode, the entire page is one TipTap editor.
    // The title "New page" is the first text, body is below it.
    // Strategy: select "New page" text, type new title, press Enter, then inject HTML for body.
    const truncatedTitle = title.length > MAX_TITLE_LENGTH
      ? title.slice(0, MAX_TITLE_LENGTH - 3) + "..."
      : title;

    // Click the "New page" title text in the content area
    const contentTitle = page.locator('div[class*="CourseModuleWrapper"] div[class*="ModuleTitle"]').first();
    if ((await contentTitle.count()) > 0) {
      await contentTitle.click();
    }
    // Select all title text and replace
    await page.keyboard.press("Meta+a");
    await page.keyboard.type(truncatedTitle);
    await page.waitForTimeout(300);

    // Move to body: press Enter to create a new line below the title
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    // Now inject HTML into the TipTap editor for the body content
    // The editor already has focus, so we inject into the current editor instance
    await this.injectTipTapContent(html);

    // Step 6: Click SAVE
    const saved = await this.clickSaveAndVerify();
    if (!saved) {
      throw new Error(`Lesson "${truncatedTitle}" created but SAVE not confirmed.`);
    }

    return true;
  }

  // ----------------------------------------------------------
  // Read operations
  // ----------------------------------------------------------

  /** Extract posts from the community page */
  async extractPosts(groupSlug: string): Promise<
    Array<{
      title: string;
      author: string;
      category: string;
      preview: string;
      url: string;
    }>
  > {
    const page = await this.page();
    await this.gotoCommunity(groupSlug);

    // Posts are rendered as links with href pattern /{group}/{post-slug}
    // Each post block has: author link, category link, title link, preview text
    // We find post title links by their href pattern (not category or author links)
    return page.evaluate((slug) => {
      const posts: Array<{
        title: string;
        author: string;
        category: string;
        preview: string;
        url: string;
      }> = [];

      // Post title links match /{group}/{post-slug} but NOT /{group}?c= (categories)
      // and NOT /@username (authors) and NOT /{group}/classroom etc.
      const reservedPaths = ["classroom", "calendar", "about", "-", "?", "signup", "legal"];
      const allLinks = document.querySelectorAll(`a[href^="/${slug}/"]`);

      allLinks.forEach((link) => {
        const href = link.getAttribute("href") || "";
        const path = href.replace(`/${slug}/`, "");

        // Skip non-post links
        if (!path || path.includes("?") || reservedPaths.some((r) => path.startsWith(r))) return;

        // This is a post title link - find surrounding context
        const text = link.textContent?.trim() || "";
        if (!text || text.length < 5) return;

        // Look for author and category in nearby sibling/parent elements
        const container = link.closest('[class*="Post"], [class*="card"], div') || link.parentElement;
        let author = "";
        let category = "";
        let preview = "";

        if (container) {
          // Author links have href starting with /@ — pick the one with a real name (not "1" avatar)
          const authorLinks = container.querySelectorAll('a[href^="/@"]');
          authorLinks.forEach((al) => {
            if (!author) {
              const t = al.textContent?.trim() || "";
              if (t.length > 1) author = t;
            }
          });

          // Category links have href with ?c=
          const catLink = container.querySelector('a[href*="?c="]');
          if (catLink) category = catLink.textContent?.trim() || "";

          // Preview is the first <p> or text block after the title
          const pEl = container.querySelector("p");
          if (pEl) preview = pEl.textContent?.trim().slice(0, 200) || "";
        }

        posts.push({ title: text, author, category, preview, url: href });
      });

      return posts;
    }, groupSlug);
  }

  /** Extract categories from the community page */
  async extractCategories(groupSlug: string): Promise<string[]> {
    const page = await this.page();
    await this.gotoCommunity(groupSlug);

    // Categories are rendered as button chips with class ChipWrapper
    return page.evaluate(() => {
      const categories: string[] = [];
      // Skool uses buttons with ChipWrapper class for category filters
      const chips = document.querySelectorAll('button[class*="ChipWrapper"]');
      chips.forEach((btn) => {
        const text = btn.textContent?.trim();
        if (text && text !== "All" && text !== "More..." && !categories.includes(text)) {
          categories.push(text);
        }
      });
      return categories;
    });
  }

  /** Extract members from the members page */
  async extractMembers(
    groupSlug: string,
    search?: string
  ): Promise<
    Array<{ name: string; level: number; contributions: number }>
  > {
    const page = await this.page();
    await this.gotoMembers(groupSlug);

    // If search query provided, fill search box
    if (search) {
      const searchInput = page.locator('input[placeholder="Search"]');
      if ((await searchInput.count()) > 0) {
        await searchInput.first().fill(search);
        await page.waitForTimeout(1500);
      }
    }

    // Members are listed as links with href /@username?g=group
    return page.evaluate((slug) => {
      const members: Array<{
        name: string;
        level: number;
        contributions: number;
      }> = [];
      const seen = new Set<string>();

      const memberLinks = document.querySelectorAll(`a[href*="?g=${slug}"]`);
      memberLinks.forEach((link) => {
        const href = link.getAttribute("href") || "";
        if (!href.startsWith("/@")) return;

        const name = link.textContent?.trim() || "";
        if (!name || name.length < 2 || seen.has(name)) return;
        seen.add(name);

        members.push({
          name,
          level: 0,
          contributions: 0,
        });
      });

      return members;
    }, groupSlug);
  }
}
