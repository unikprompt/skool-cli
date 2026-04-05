import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const listEventsCommand = new Command("list-events")
  .description("List calendar events")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.listEvents(opts.group);
      if (!result.success) {
        console.log(`FAIL: ${result.message}`);
        process.exit(1);
      }
      if (opts.json) {
        console.log(JSON.stringify(result.events, null, 2));
      } else if (result.events.length === 0) {
        console.log("No upcoming events.");
      } else {
        console.log(`${result.events.length} event(s):\n`);
        result.events.forEach((e) => {
          console.log(`  ${e.title}`);
          console.log(`  ID: ${e.id}`);
          console.log(`  ${e.startTime} - ${e.endTime}`);
          console.log();
        });
      }
    } finally {
      await client.close();
    }
  });
