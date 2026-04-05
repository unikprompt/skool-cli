import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const moveLessonCommand = new Command("move-lesson")
  .description("Move a lesson to a different folder")
  .requiredOption("--id <pageId>", "Lesson ID to move")
  .option("--target-folder <name>", "Target folder name")
  .option("--target-folder-id <id>", "Target folder ID directly")
  .option("-g, --group <slug>", "Skool group slug (required with --target-folder)", process.env.SKOOL_GROUP)
  .option("--course <name>", "Course name (if multiple courses)")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.moveLesson({
        id: opts.id,
        targetFolderId: opts.targetFolderId,
        targetFolder: opts.targetFolder,
        group: opts.group,
        course: opts.course,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
