import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const createCourseCommand = new Command("create-course")
  .description("Create a new course in a Skool group")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .requiredOption("-t, --title <title>", "Course title (max 50 chars)")
  .option("-d, --description <text>", "Course description (max 500 chars)")
  .option("--privacy <type>", "Access type: open, level, buy, time, private", "open")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      console.log(`Creating course "${opts.title}"...`);
      const result = await client.createCourse({
        group: opts.group,
        title: opts.title,
        description: opts.description,
        privacy: opts.privacy,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
