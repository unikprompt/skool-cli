import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const sendChatMessageCommand = new Command("send-chat-message")
  .description("Send a message in a chat conversation (via browser automation)")
  .requiredOption("--channel <id>", "Chat channel ID (get from get-chats)")
  .requiredOption("-m, --message <text>", "Message to send")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.sendChatMessage(opts.channel, opts.message);
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
