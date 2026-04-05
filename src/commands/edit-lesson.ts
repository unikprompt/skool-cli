import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const editLessonCommand = new Command("edit-lesson")
  .description("Edit an existing lesson's title and/or content")
  .requiredOption("--id <pageId>", "Lesson ID to edit")
  .option("-t, --title <title>", "New title")
  .option("-f, --file <path>", "Content file (.md, .html, .json)")
  .option("--html <html>", "HTML content string")
  .option("--markdown <markdown>", "Markdown content string")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.editLesson({
        id: opts.id,
        title: opts.title,
        filePath: opts.file,
        htmlContent: opts.html,
        markdownContent: opts.markdown,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
