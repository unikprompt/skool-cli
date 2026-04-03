import { join } from "node:path";
import { homedir } from "node:os";

/** Base directory for all skool-cli data */
export const DATA_DIR =
  process.env.SKOOL_CLI_DATA_DIR || join(homedir(), ".skool-cli");

/** Directory for Playwright persistent browser context */
export const BROWSER_DATA_DIR = join(DATA_DIR, "browser-data");

/** Default timeout for operations in ms */
export const DEFAULT_TIMEOUT = Number(process.env.SKOOL_CLI_TIMEOUT) || 30_000;

/** Whether to run browser in headless mode */
export const HEADLESS = process.env.SKOOL_CLI_HEADLESS !== "false";

/** Skool base URL */
export const SKOOL_BASE_URL = "https://www.skool.com";

/** Delay after SPA navigation (ms) */
export const SPA_NAV_DELAY = 2000;

/** Max characters for lesson titles in Skool */
export const MAX_TITLE_LENGTH = 50;
