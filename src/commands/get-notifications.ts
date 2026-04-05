import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const getNotificationsCommand = new Command("get-notifications")
  .description("Get your Skool notifications")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.getNotifications();
      if (!result.success) {
        console.log(`FAIL: ${result.message}`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.notifications, null, 2));
      } else if (result.notifications.length === 0) {
        console.log("No notifications.");
      } else {
        const unread = result.notifications.filter((n) => n.unread).length;
        console.log(`${result.notifications.length} notification(s) (${unread} unread):\n`);
        for (const n of result.notifications) {
          const marker = n.unread ? "[NEW]" : "     ";
          const date = n.createdAt.split("T")[0];
          console.log(`  ${marker} ${n.displayName} ${n.text}`);
          if (n.groupName) console.log(`        ${n.groupName} - ${date}`);
          console.log();
        }
      }
    } finally {
      await client.close();
    }
  });
