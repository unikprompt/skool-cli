import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const createFolderCommand = new Command("create-folder")
  .description("Create a new folder (module) in a Skool classroom course")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .requiredOption("-t, --title <title>", "Folder name (max 50 chars)")
  .option("--course <name>", "Course name (if multiple courses exist)")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      console.log(`Creating folder "${opts.title}"...`);
      const result = await client.createFolder({
        group: opts.group,
        title: opts.title,
        course: opts.course,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
