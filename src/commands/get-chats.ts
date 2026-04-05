import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const getChatsCommand = new Command("get-chats")
  .description("List your Skool chat conversations")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.getChats();
      if (!result.success) {
        console.log(`FAIL: ${result.message}`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.channels, null, 2));
      } else if (result.channels.length === 0) {
        console.log("No chat conversations.");
      } else {
        console.log(`${result.channels.length} conversation(s):\n`);
        for (const ch of result.channels) {
          const unread = ch.unreadCount > 0 ? ` (${ch.unreadCount} unread)` : "";
          const date = ch.lastMessageAt.split("T")[0];
          console.log(`  ${ch.userName}${unread}`);
          if (ch.userBio) console.log(`  ${ch.userBio}`);
          console.log(`  ID: ${ch.id}`);
          console.log(`  Last message: ${date}`);
          console.log();
        }
      }
    } finally {
      await client.close();
    }
  });
