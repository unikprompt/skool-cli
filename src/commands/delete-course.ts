import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const deleteCourseCommand = new Command("delete-course")
  .description("Delete a course by ID")
  .requiredOption("--id <courseId>", "Course ID to delete")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.deleteCourse(opts.id);
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
