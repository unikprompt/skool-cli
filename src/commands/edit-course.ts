import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const editCourseCommand = new Command("edit-course")
  .description("Edit a course's title, description, or privacy")
  .requiredOption("--id <courseId>", "Course ID to edit")
  .option("-t, --title <title>", "New title")
  .option("-d, --description <text>", "New description")
  .option("--privacy <type>", "Access type: open, level, buy, time, private")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.editCourse({
        id: opts.id,
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
