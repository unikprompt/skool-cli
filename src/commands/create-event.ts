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
  .option("--repeat <schedule>", "Recurrence: weekly:mon,wed or daily or biweekly:fri")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      // Parse recurrence
      let recurrence: { frequency: string; interval: number; days: number[] } | undefined;
      if (opts.repeat) {
        const dayMap: Record<string, number> = {
          mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
        };
        const parts = opts.repeat.split(":");
        const freq = parts[0].toLowerCase();
        const dayNames = parts[1] ? parts[1].split(",") : [];
        const days = dayNames.map((d: string) => dayMap[d.trim().toLowerCase()] ?? -1).filter((d: number) => d >= 0);

        if (freq === "daily") {
          recurrence = { frequency: "daily", interval: 1, days: [] };
        } else if (freq === "weekly") {
          recurrence = { frequency: "weekly", interval: 1, days };
        } else if (freq === "biweekly") {
          recurrence = { frequency: "weekly", interval: 2, days };
        }
      }

      console.log(`Creating event "${opts.title}"...`);
      const result = await client.createEvent({
        group: opts.group,
        title: opts.title,
        description: opts.description,
        startTime: opts.start,
        endTime: opts.end,
        timezone: opts.timezone,
        coverImage: opts.cover,
        recurrence,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
