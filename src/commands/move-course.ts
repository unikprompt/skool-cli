import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const moveCourseCommand = new Command("move-course")
  .description("Move a course left or right in the classroom order")
  .requiredOption("--id <courseId>", "Course ID to move")
  .requiredOption("--direction <dir>", "Direction: left or right")
  .action(async (opts) => {
    const dir = opts.direction.toLowerCase();
    if (dir !== "left" && dir !== "right") {
      console.log("FAIL: Direction must be 'left' or 'right'");
      process.exit(1);
    }
    const client = new SkoolClient();
    try {
      const result = await client.moveCourse(opts.id, dir);
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });
