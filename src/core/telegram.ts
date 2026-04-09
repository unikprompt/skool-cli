import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { TELEGRAM_CONFIG_FILE } from "./config.js";

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

/** Load Telegram config from env vars or disk */
export function loadTelegramConfig(): TelegramConfig | null {
  // Env vars take precedence
  const envToken = process.env.SKOOL_TELEGRAM_BOT_TOKEN;
  const envChat = process.env.SKOOL_TELEGRAM_CHAT_ID;
  if (envToken && envChat) {
    return { botToken: envToken, chatId: envChat };
  }

  try {
    if (!existsSync(TELEGRAM_CONFIG_FILE)) return null;
    const raw = readFileSync(TELEGRAM_CONFIG_FILE, "utf-8");
    const data = JSON.parse(raw) as TelegramConfig;
    if (!data.botToken || !data.chatId) return null;
    return data;
  } catch {
    return null;
  }
}

/** Save Telegram config to disk */
export function saveTelegramConfig(botToken: string, chatId: string): void {
  const dir = dirname(TELEGRAM_CONFIG_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    TELEGRAM_CONFIG_FILE,
    JSON.stringify({ botToken, chatId }, null, 2),
    "utf-8"
  );
}

/** Send a message via Telegram Bot API */
export async function sendTelegramMessage(
  text: string,
  config?: TelegramConfig | null
): Promise<{ success: boolean; message: string }> {
  const cfg = config ?? loadTelegramConfig();
  if (!cfg) {
    return {
      success: false,
      message: "Telegram not configured. Run: skool watch-members --setup-telegram",
    };
  }

  try {
    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, message: `Telegram API error: ${res.status} ${body}` };
    }

    return { success: true, message: "Message sent to Telegram" };
  } catch (error) {
    return { success: false, message: `Telegram error: ${(error as Error).message}` };
  }
}

/** Format a new member notification for Telegram */
export function formatNewMemberMessage(
  memberName: string,
  groupName: string,
  joinedAt: string
): string {
  const timeAgo = getTimeAgo(joinedAt);
  return [
    `<b>New member in ${escapeHtml(groupName)}</b>`,
    `${escapeHtml(memberName)}`,
    `Joined ${timeAgo}`,
  ].join("\n");
}

/** Format a pending member request notification for Telegram */
export function formatPendingMemberMessage(
  memberName: string,
  groupName: string,
  requestedAt: string,
  questions?: { question: string; answer: string }[]
): string {
  const timeAgo = getTimeAgo(requestedAt);
  const lines = [
    `<b>Pending request in ${escapeHtml(groupName)}</b>`,
    `${escapeHtml(memberName)}`,
    `Requested ${timeAgo}`,
  ];
  if (questions && questions.length > 0) {
    lines.push("");
    for (const qa of questions) {
      lines.push(`<b>Q:</b> ${escapeHtml(qa.question)}`);
      lines.push(`<b>A:</b> ${escapeHtml(qa.answer)}`);
    }
  }
  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getTimeAgo(isoDate: string): string {
  if (!isoDate) return "just now";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
