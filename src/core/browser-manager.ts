import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, HEADLESS, DEFAULT_TIMEOUT } from "./config.js";

/** Path to saved auth state (cookies + localStorage) */
const AUTH_STATE_PATH = join(DATA_DIR, "auth-state.json");

/**
 * Manages Playwright browser lifecycle for skool-cli.
 *
 * Uses explicit cookie save/load (like playwright-cli state-save/load)
 * because launchPersistentContext doesn't reliably persist across
 * separate CLI invocations.
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private closing = false;

  /** Get (or create) the reusable page */
  async getPage(): Promise<Page> {
    if (this.closing) {
      throw new Error("Browser is shutting down");
    }

    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    // Ensure data dir exists
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: HEADLESS,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
        ],
      });

      // Create context with saved auth state if available
      const contextOptions: Parameters<Browser["newContext"]>[0] = {
        viewport: { width: 1280, height: 800 },
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      };

      if (existsSync(AUTH_STATE_PATH)) {
        contextOptions.storageState = AUTH_STATE_PATH;
      }

      this.context = await this.browser.newContext(contextOptions);

      // Register cleanup handlers once
      const cleanup = () => void this.close();
      process.once("SIGTERM", cleanup);
      process.once("SIGINT", cleanup);
      process.once("exit", cleanup);
    }

    if (!this.context) {
      throw new Error("Browser context not initialized");
    }

    // Reuse existing pages or create new one
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
    this.page.setDefaultTimeout(DEFAULT_TIMEOUT);

    return this.page;
  }

  /** Save current auth state (cookies + localStorage) to disk */
  async saveAuthState(): Promise<void> {
    if (!this.context) return;

    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    await this.context.storageState({ path: AUTH_STATE_PATH });
  }

  /** Check if saved auth state exists on disk */
  hasAuthState(): boolean {
    return existsSync(AUTH_STATE_PATH);
  }

  /** Check if a browser context is currently active */
  isActive(): boolean {
    return this.browser !== null && !this.closing;
  }

  /** Close browser and cleanup */
  async close(): Promise<void> {
    if (this.closing) return;
    this.closing = true;

    try {
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
    } catch {
      // Ignore errors during shutdown
    } finally {
      this.browser = null;
      this.context = null;
      this.page = null;
      this.closing = false;
    }
  }
}
