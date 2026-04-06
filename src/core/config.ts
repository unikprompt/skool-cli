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

/** File to cache update check state */
export const UPDATE_CHECK_FILE = join(DATA_DIR, "update-check.json");

/** Interval between update checks (24 hours) */
export const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;

/** npm registry URL for version check */
export const NPM_REGISTRY_URL = "https://registry.npmjs.org/skool-cli/latest";

/** Disable update checks via env var */
export const UPDATE_CHECK_DISABLED =
  process.env.SKOOL_CLI_NO_UPDATE_CHECK === "true";

/** File to persist known members for watch-members */
export const WATCH_STATE_FILE = join(DATA_DIR, "watch-members.json");

/** File to store Telegram bot config */
export const TELEGRAM_CONFIG_FILE = join(DATA_DIR, "telegram.json");

/** Default polling interval for watch-members (ms) */
export const DEFAULT_WATCH_INTERVAL = 5 * 60 * 1000;
