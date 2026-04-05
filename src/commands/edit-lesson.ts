import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const editLessonCommand = new Command("edit-lesson")
  .description("Edit an existing lesson's title and/or content")
  .requiredOption("--id <pageId>", "Lesson ID to edit")
  .option("-t, --title <title>", "New title")
  .option("-f, --file <path>", "Content file (.md, .html, .json)")
  .option("--html <html>", "HTML content string")
  .option("--markdown <markdown>", "Markdown content string")
  .option("--video <url>", "YouTube/Vimeo/Loom video URL")
  .option("--resource <title::url>", "Attached resource link (repeatable)", (val: string, acc: string[]) => { acc.push(val); return acc; }, [])
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const resources = (opts.resource as string[]).map((r: string) => {
        const [title, link] = r.split("::");
        return { title: title.trim(), link: link.trim() };
      }).filter(r => r.title && r.link);

      const result = await client.editLesson({
        id: opts.id,
        title: opts.title,
        filePath: opts.file,
        htmlContent: opts.html,
        markdownContent: opts.markdown,
        videoUrl: opts.video,
        resources: resources.length > 0 ? resources : undefined,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
