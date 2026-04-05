import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import {
  DATA_DIR,
  UPDATE_CHECK_FILE,
  UPDATE_CHECK_INTERVAL,
  NPM_REGISTRY_URL,
  UPDATE_CHECK_DISABLED,
} from "./config.js";

interface UpdateCheckState {
  lastCheck: number;
  latestVersion?: string;
}

/**
 * Compare two semver strings. Returns:
 *  -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

function readState(): UpdateCheckState | null {
  try {
    return JSON.parse(readFileSync(UPDATE_CHECK_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeState(state: UpdateCheckState): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(UPDATE_CHECK_FILE, JSON.stringify(state));
}

/**
 * Check npm registry for a newer version of skool-cli.
 * Prints a notice to stderr if an update is available.
 * Non-blocking, swallows all errors silently.
 */
export async function checkForUpdate(currentVersion: string): Promise<void> {
  if (UPDATE_CHECK_DISABLED) return;

  const state = readState();
  const now = Date.now();

  // If we checked recently, just show cached result if applicable
  if (state && now - state.lastCheck < UPDATE_CHECK_INTERVAL) {
    if (state.latestVersion && compareVersions(currentVersion, state.latestVersion) < 0) {
      printNotice(currentVersion, state.latestVersion);
    }
    return;
  }

  // Fetch latest version from npm
  const res = await fetch(NPM_REGISTRY_URL);
  if (!res.ok) return;

  const data = (await res.json()) as { version: string };
  const latest = data.version;

  writeState({ lastCheck: now, latestVersion: latest });

  if (compareVersions(currentVersion, latest) < 0) {
    printNotice(currentVersion, latest);
  }
}

function printNotice(current: string, latest: string): void {
  const msg = `Update available: ${current} \u2192 ${latest}`;
  const cmd = "Run: npm update -g skool-cli";
  const width = Math.max(msg.length, cmd.length) + 4;
  const pad = (s: string) => `\u2502  ${s.padEnd(width - 4)}  \u2502`;
  const top = `\u256D${"─".repeat(width)}\u256E`;
  const bot = `\u2570${"─".repeat(width)}\u256F`;

  process.stderr.write(`\n${top}\n${pad(msg)}\n${pad(cmd)}\n${bot}\n\n`);
}
