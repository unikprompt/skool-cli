import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { WATCH_STATE_FILE } from "./config.js";
import { SkoolClient } from "./skool-client.js";
import { PendingMember } from "./types.js";
import {
  loadTelegramConfig,
  sendTelegramMessage,
  formatPendingMemberMessage,
} from "./telegram.js";

export interface PendingWatchState {
  [groupSlug: string]: string[]; // array of pending member IDs already notified
}

export interface PendingWatchOptions {
  group: string;
  interval: number;
  json?: boolean;
}

const PENDING_STATE_KEY = (slug: string) => `pending:${slug}`;

/** Load known pending member IDs from disk */
export function loadKnownPending(groupSlug: string): string[] {
  try {
    if (!existsSync(WATCH_STATE_FILE)) return [];
    const raw = readFileSync(WATCH_STATE_FILE, "utf-8");
    const state = JSON.parse(raw) as PendingWatchState;
    return state[PENDING_STATE_KEY(groupSlug)] || [];
  } catch {
    return [];
  }
}

/** Save known pending member IDs to disk */
export function saveKnownPending(groupSlug: string, memberIds: string[]): void {
  const dir = dirname(WATCH_STATE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let state: PendingWatchState = {};
  try {
    if (existsSync(WATCH_STATE_FILE)) {
      state = JSON.parse(readFileSync(WATCH_STATE_FILE, "utf-8")) as PendingWatchState;
    }
  } catch {
    // start fresh
  }

  state[PENDING_STATE_KEY(groupSlug)] = memberIds;
  writeFileSync(WATCH_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

/** Detect new pending members by comparing current list against known IDs */
export function detectNewPending(
  currentPending: PendingMember[],
  knownIds: string[]
): PendingMember[] {
  const knownSet = new Set(knownIds);
  return currentPending.filter((m) => !knownSet.has(m.id));
}

/** Run one check cycle for pending members */
export async function checkPendingOnce(
  client: SkoolClient,
  group: string
): Promise<{ newPending: PendingMember[]; allPending: PendingMember[] }> {
  const result = await client.getPendingMembers(group);
  if (!result.success) {
    throw new Error("Failed to fetch pending members");
  }

  const knownIds = loadKnownPending(group);
  const isFirstRun = knownIds.length === 0;
  const newPending = isFirstRun ? [] : detectNewPending(result.pending, knownIds);

  // Save current snapshot
  saveKnownPending(
    group,
    result.pending.map((m) => m.id)
  );

  return { newPending, allPending: result.pending };
}

/** Start the pending members watch loop */
export async function startWatchingPending(options: PendingWatchOptions): Promise<void> {
  const { group, interval, json } = options;
  const telegramConfig = loadTelegramConfig();

  if (!telegramConfig) {
    console.log(
      "Warning: Telegram not configured. Run: skool watch-members --setup-telegram"
    );
    console.log("Notifications will only appear in console.\n");
  }

  const client = new SkoolClient();

  const log = (msg: string) => {
    if (!json) console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
  };

  log(`Watching pending requests for ${group} every ${Math.round(interval / 60000)}m...`);
  log("Press Ctrl+C to stop.\n");

  const runCheck = async () => {
    try {
      log("Checking pending requests...");
      const { newPending, allPending } = await checkPendingOnce(client, group);

      if (newPending.length === 0) {
        log(`${allPending.length} pending request(s), no new ones.`);
        return;
      }

      for (const member of newPending) {
        const name = `${member.firstName} ${member.lastName}`.trim();

        if (json) {
          console.log(
            JSON.stringify({
              event: "new_pending_request",
              member: { id: member.id, name, requestedAt: member.requestedAt, questions: member.questions },
              group,
              timestamp: new Date().toISOString(),
            })
          );
        } else {
          console.log(`\n  PENDING REQUEST: ${name} (@${member.name})`);
          console.log(`  Requested: ${member.requestedAt}`);
          if (member.bio) console.log(`  Bio: ${member.bio.slice(0, 80)}`);
          if (member.questions) {
            for (const qa of member.questions) {
              console.log(`  Q: ${qa.question}`);
              console.log(`  A: ${qa.answer}`);
            }
          }
          console.log();
        }

        // Telegram notification
        if (telegramConfig) {
          const msg = formatPendingMemberMessage(name, group, member.requestedAt, member.questions);
          const tgResult = await sendTelegramMessage(msg, telegramConfig);
          if (!tgResult.success) {
            log(`Telegram error: ${tgResult.message}`);
          } else {
            log("Telegram notification sent.");
          }
        }
      }

      log(`${newPending.length} new pending request(s) detected.`);
    } catch (error) {
      log(`Error: ${(error as Error).message}`);
    }
  };

  // First run
  await runCheck();

  // Polling loop
  const timer = setInterval(runCheck, interval);

  // Graceful shutdown
  const cleanup = async () => {
    clearInterval(timer);
    log("Stopping pending watcher...");
    await client.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Keep process alive
  await new Promise(() => {});
}
