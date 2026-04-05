import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const createEventCommand = new Command("create-event")
  .description("Create a calendar event")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .requiredOption("-t, --title <title>", "Event title")
  .requiredOption("--start <datetime>", "Start time (ISO 8601, e.g. 2026-04-10T14:00:00-04:00)")
  .requiredOption("--end <datetime>", "End time (ISO 8601, e.g. 2026-04-10T15:00:00-04:00)")
  .option("-d, --description <text>", "Event description")
  .option("--timezone <tz>", "Timezone (default: America/New_York)")
  .option("--cover <path>", "Cover image file path")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      console.log(`Creating event "${opts.title}"...`);
      const result = await client.createEvent({
        group: opts.group,
        title: opts.title,
        description: opts.description,
        startTime: opts.start,
        endTime: opts.end,
        timezone: opts.timezone,
        coverImage: opts.cover,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
