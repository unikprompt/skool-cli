import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const duplicateCourseCommand = new Command("duplicate-course")
  .description("Duplicate a course with all its content")
  .requiredOption("--id <courseId>", "Course ID to duplicate")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      console.log("Duplicating course...");
      const result = await client.duplicateCourse(opts.id);
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
