import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const deleteEventCommand = new Command("delete-event")
  .description("Delete a calendar event")
  .requiredOption("--id <eventId>", "Event ID to delete")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.deleteEvent(opts.id);
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
