import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const deleteLessonCommand = new Command("delete-lesson")
  .description("Delete a lesson or folder by ID")
  .requiredOption("--id <pageId>", "Page or folder ID to delete")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.deleteLesson(opts.id);
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
