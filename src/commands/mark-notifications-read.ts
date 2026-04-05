import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const markNotificationsReadCommand = new Command("mark-notifications-read")
  .description("Mark all notifications as read")
  .action(async () => {
    const client = new SkoolClient();
    try {
      const result = await client.markNotificationsRead();
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
