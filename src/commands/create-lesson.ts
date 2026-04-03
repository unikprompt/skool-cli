import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const createLessonCommand = new Command("create-lesson")
  .description("Create a new lesson in a Skool classroom module")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .requiredOption("-m, --module <name>", "Module name (exact match)")
  .requiredOption("-t, --title <title>", "Lesson title (max 50 chars)")
  .option("--course <name>", "Course name (if multiple courses exist)")
  .option("--folder <name>", "Folder/module name to create the lesson in")
  .option("--folder-id <id>", "Folder ID directly (from create-folder output)")
  .option("-f, --file <path>", "Content file (.md, .html, or .json with skool_class)")
  .option("--html <path>", "HTML file to inject directly")
  .option("--markdown <text>", "Inline markdown content")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      console.log(`Creating lesson "${opts.title}" in module "${opts.module}"...`);
      const result = await client.createLesson({
        group: opts.group,
        module: opts.module,
        title: opts.title,
        course: opts.course,
        folder: opts.folder,
        folderId: opts.folderId,
        filePath: opts.file || opts.html,
        markdownContent: opts.markdown,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
