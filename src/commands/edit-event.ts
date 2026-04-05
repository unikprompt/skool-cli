import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const editEventCommand = new Command("edit-event")
  .description("Edit a calendar event")
  .requiredOption("--id <eventId>", "Event ID to edit")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("-t, --title <title>", "New title")
  .option("-d, --description <text>", "New description")
  .option("--start <datetime>", "New start time (ISO 8601)")
  .option("--end <datetime>", "New end time (ISO 8601)")
  .option("--timezone <tz>", "New timezone")
  .option("--cover <path>", "New cover image")
  .option("--repeat <schedule>", "Change recurrence: weekly:tue or daily or none")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      // Parse recurrence
      let recurrence: { frequency: string; interval: number; days: number[] } | undefined;
      if (opts.repeat) {
        if (opts.repeat === "none") {
          recurrence = { frequency: "", interval: 0, days: [] };
        } else {
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
      }

      const result = await client.editEvent({
        id: opts.id,
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
