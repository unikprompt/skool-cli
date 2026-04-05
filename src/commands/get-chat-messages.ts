import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const getChatMessagesCommand = new Command("get-chat-messages")
  .description("Read messages from a chat conversation")
  .requiredOption("--channel <id>", "Chat channel ID (get from get-chats)")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.getChatMessages(opts.channel);
      if (!result.success) {
        console.log(`FAIL: ${result.message}`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.messages, null, 2));
      } else if (result.messages.length === 0) {
        console.log("No messages in this conversation.");
      } else {
        console.log(`${result.messages.length} message(s):\n`);
        for (const m of result.messages) {
          const date = m.createdAt.split("T")[0];
          const time = m.createdAt.split("T")[1]?.split(".")[0] || "";
          console.log(`  [${date} ${time}] ${m.senderId.slice(0, 8)}...`);
          console.log(`  ${m.content}`);
          console.log();
        }
      }
    } finally {
      await client.close();
    }
  });
