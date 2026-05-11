import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const getLessonCommand = new Command("get-lesson")
  .description(
    "Get a lesson's content (HTML) and metadata. Provide --url OR (--group and --id)."
  )
  .option("--id <pageId>", "Lesson page ID")
  .option("-g, --group <slug>", "Skool group slug")
  .option("--course <name>", "Course name hint (used for discovery)")
  .option("--course-short-id <shortId>", "Course short ID (skips auto-discovery)")
  .option("--url <url>", "Full lesson URL (overrides --id/--group)")
  .option("--json", "Output as JSON with full metadata")
  .action(async (opts) => {
    if (!opts.url && !(opts.group && opts.id)) {
      console.error("FAIL: provide --url OR (--group and --id)");
      process.exit(1);
    }
    const client = new SkoolClient();
    try {
      const result = await client.getLesson({
        pageId: opts.id,
        group: opts.group,
        courseName: opts.course,
        courseShortId: opts.courseShortId,
        url: opts.url,
      });
      if (!result.success || !result.data) {
        console.error(`FAIL: ${result.message}`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.data, null, 2));
        return;
      }

      const { title, html, videoLink, coursePath } = result.data;
      if (coursePath && coursePath.length > 0) {
        console.log(`Path: ${coursePath.join(" / ")}`);
      }
      if (title) console.log(`# ${title}\n`);
      if (videoLink) console.log(`Video: ${videoLink}\n`);
      console.log(html || "(empty lesson)");
    } finally {
      await client.close();
    }
  });
