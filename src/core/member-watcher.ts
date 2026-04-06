import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { WATCH_STATE_FILE } from "./config.js";
import { SkoolClient } from "./skool-client.js";
import { SkoolMember } from "./types.js";
import {
  loadTelegramConfig,
  sendTelegramMessage,
  formatNewMemberMessage,
} from "./telegram.js";

export interface WatchState {
  [groupSlug: string]: string[]; // array of member IDs
}

export interface WatchOptions {
  group: string;
  interval: number;
  welcomeMessage?: string;
  json?: boolean;
}

/** Load known member IDs from disk */
export function loadKnownMembers(groupSlug: string): string[] {
  try {
    if (!existsSync(WATCH_STATE_FILE)) return [];
    const raw = readFileSync(WATCH_STATE_FILE, "utf-8");
    const state = JSON.parse(raw) as WatchState;
    return state[groupSlug] || [];
  } catch {
    return [];
  }
}

/** Save known member IDs to disk */
export function saveKnownMembers(groupSlug: string, memberIds: string[]): void {
  const dir = dirname(WATCH_STATE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let state: WatchState = {};
  try {
    if (existsSync(WATCH_STATE_FILE)) {
      state = JSON.parse(readFileSync(WATCH_STATE_FILE, "utf-8")) as WatchState;
    }
  } catch {
    // start fresh
  }

  state[groupSlug] = memberIds;
  writeFileSync(WATCH_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

/** Detect new members by comparing current list against known IDs */
export function detectNewMembers(
  currentMembers: SkoolMember[],
  knownIds: string[]
): SkoolMember[] {
  const knownSet = new Set(knownIds);
  return currentMembers.filter((m) => !knownSet.has(m.id));
}

/** Parse interval string like "5m", "1h", "30s" to milliseconds */
export function parseInterval(input: string): number {
  const match = input.match(/^(\d+)(s|m|h)$/);
  if (!match) return 5 * 60 * 1000; // default 5m
  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "s") return Math.max(value * 1000, 60000); // min 1m
  if (unit === "h") return value * 3600000;
  return Math.max(value * 60000, 60000); // min 1m
}

/** Run one check cycle, returns new members found */
export async function checkOnce(
  client: SkoolClient,
  group: string
): Promise<{ newMembers: SkoolMember[]; allMembers: SkoolMember[] }> {
  const result = await client.getMembers(group);
  if (!result.success) {
    throw new Error("Failed to fetch members");
  }

  const knownIds = loadKnownMembers(group);
  const isFirstRun = knownIds.length === 0;
  const newMembers = isFirstRun ? [] : detectNewMembers(result.members, knownIds);

  // Save current snapshot
  saveKnownMembers(
    group,
    result.members.map((m) => m.id)
  );

  return { newMembers, allMembers: result.members };
}

/** Start the watch loop */
export async function startWatching(options: WatchOptions): Promise<void> {
  const { group, interval, welcomeMessage, json } = options;
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

  log(`Watching ${group} every ${Math.round(interval / 60000)}m...`);
  log("Press Ctrl+C to stop.\n");

  const runCheck = async () => {
    try {
      log("Checking members...");
      const { newMembers, allMembers } = await checkOnce(client, group);

      if (newMembers.length === 0) {
        log(`${allMembers.length} members, no new ones.`);
        return;
      }

      for (const member of newMembers) {
        const name = `${member.firstName} ${member.lastName}`.trim();

        if (json) {
          console.log(
            JSON.stringify({
              event: "new_member",
              member: { id: member.id, name, joinedAt: member.joinedAt },
              group,
              timestamp: new Date().toISOString(),
            })
          );
        } else {
          console.log(`\n  NEW MEMBER: ${name} (@${member.name})`);
          console.log(`  Level ${member.level} | Joined: ${member.joinedAt}`);
          if (member.bio) console.log(`  Bio: ${member.bio.slice(0, 80)}`);
          console.log();
        }

        // Telegram notification
        if (telegramConfig) {
          const msg = formatNewMemberMessage(name, group, member.joinedAt);
          const tgResult = await sendTelegramMessage(msg, telegramConfig);
          if (!tgResult.success) {
            log(`Telegram error: ${tgResult.message}`);
          } else {
            log("Telegram notification sent.");
          }
        }

        // Optional welcome DM
        if (welcomeMessage) {
          const personalMsg = welcomeMessage.replace(
            /#NAME#/g,
            member.firstName || name
          );
          log(`Sending welcome DM to ${name}...`);
          // We need to find or create a chat channel with this user
          // For now, log intent - DM requires channel ID which we may not have yet
          log(
            `Welcome DM: "${personalMsg.slice(0, 50)}..." (requires existing chat channel)`
          );
        }
      }

      log(`${newMembers.length} new member(s) detected.`);
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
    log("Stopping watcher...");
    await client.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Keep process alive
  await new Promise(() => {});
}
