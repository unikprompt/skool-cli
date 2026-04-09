import { Command } from "commander";
import { createInterface } from "node:readline";
import { saveTelegramConfig, loadTelegramConfig, sendTelegramMessage } from "../core/telegram.js";
import { startWatching, parseInterval } from "../core/member-watcher.js";

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export const watchMembersCommand = new Command("watch-members")
  .description("Watch for new members and notify via Telegram")
  .option("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--interval <time>", "Polling interval (e.g. 5m, 1h)", "5m")
  .option("--setup-telegram", "Configure Telegram bot interactively")
  .option("--welcome <message>", "Welcome DM message (#NAME# as variable)")
  .option("--include-pending", "Also watch for pending membership requests")
  .option("--json", "Output events as JSON")
  .action(async (opts) => {
    // Setup mode
    if (opts.setupTelegram) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        console.log("Telegram Bot Setup");
        console.log("==================\n");
        console.log("1. Open Telegram and message @BotFather");
        console.log("2. Send /newbot and follow the steps");
        console.log("3. Copy the bot token\n");

        const token = (await ask(rl, "Bot token: ")).trim();
        if (!token) {
          console.error("Token is required.");
          process.exit(1);
        }

        console.log("\n4. Send a message to your bot first");
        console.log("5. To get your chat_id, you can:");
        console.log("   - Message @userinfobot on Telegram");
        console.log("   - Or use a group chat ID (starts with -)\n");

        const chatId = (await ask(rl, "Chat ID: ")).trim();
        if (!chatId) {
          console.error("Chat ID is required.");
          process.exit(1);
        }

        saveTelegramConfig(token, chatId);
        console.log("\nConfig saved. Sending test message...");

        const result = await sendTelegramMessage(
          "skool-cli connected! You will receive new member notifications here.",
          { botToken: token, chatId }
        );

        if (result.success) {
          console.log("Test message sent! Check your Telegram.");
        } else {
          console.error(`Failed: ${result.message}`);
          console.log("Config saved anyway. You can retry later.");
        }
      } finally {
        rl.close();
      }
      return;
    }

    // Watch mode
    if (!opts.group) {
      console.error("Group is required. Use -g <slug> or set SKOOL_GROUP env var.");
      process.exit(1);
    }

    const interval = parseInterval(opts.interval);

    await startWatching({
      group: opts.group,
      interval,
      welcomeMessage: opts.welcome,
      json: opts.json,
      includePending: opts.includePending,
    });
  });
